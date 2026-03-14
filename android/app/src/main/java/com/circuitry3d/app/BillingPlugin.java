package com.circuitry3d.app;

import android.app.Activity;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

/**
 * Capacitor plugin that exposes Google Play Billing to the web layer.
 *
 * Exposed methods (callable via window.Capacitor.Plugins.Billing):
 *   initialize()          — connect the BillingClient
 *   getProducts(skus)     — query subscription product details
 *   purchase(sku)         — launch the Play Store subscription flow
 *   restorePurchases()    — query all active subscriptions
 *
 * Emitted events:
 *   purchaseCompleted     — { success, purchaseToken, orderId, products[] }
 *   purchaseFailed        — { success, cancelled, error }
 */
@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(
                        PendingPurchasesParams.newBuilder()
                                .enableOneTimeProducts()
                                .build()
                )
                .build();
    }

    /** Connect the billing client. Must be called before any other method. */
    @PluginMethod
    public void initialize(PluginCall call) {
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    call.resolve();
                } else {
                    call.reject("Billing setup failed: " + result.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Will reconnect automatically on next call
            }
        });
    }

    /** Query Play Store for subscription product details by SKU list. */
    @PluginMethod
    public void getProducts(PluginCall call) {
        JSArray skus = call.getArray("skus");
        if (skus == null || skus.length() == 0) {
            call.reject("skus array is required");
            return;
        }

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        try {
            for (int i = 0; i < skus.length(); i++) {
                products.add(
                        QueryProductDetailsParams.Product.newBuilder()
                                .setProductId(skus.getString(i))
                                .setProductType(BillingClient.ProductType.SUBS)
                                .build()
                );
            }
        } catch (Exception e) {
            call.reject("Invalid skus: " + e.getMessage());
            return;
        }

        billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                (billingResult, productDetailsList) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Product query failed: " + billingResult.getDebugMessage());
                        return;
                    }

                    JSArray resultArray = new JSArray();
                    for (ProductDetails detail : productDetailsList) {
                        JSObject item = new JSObject();
                        item.put("productId", detail.getProductId());
                        item.put("title", detail.getTitle());
                        item.put("description", detail.getDescription());

                        List<ProductDetails.SubscriptionOfferDetails> offers =
                                detail.getSubscriptionOfferDetails();
                        if (offers != null && !offers.isEmpty()) {
                            ProductDetails.SubscriptionOfferDetails offer = offers.get(0);
                            item.put("offerToken", offer.getOfferToken());
                            List<ProductDetails.PricingPhase> phases =
                                    offer.getPricingPhases().getPricingPhaseList();
                            if (!phases.isEmpty()) {
                                ProductDetails.PricingPhase phase = phases.get(0);
                                item.put("price", phase.getFormattedPrice());
                                item.put("priceMicros", phase.getPriceAmountMicros());
                                item.put("currencyCode", phase.getPriceCurrencyCode());
                            }
                        }
                        resultArray.put(item);
                    }

                    JSObject ret = new JSObject();
                    ret.put("products", resultArray);
                    call.resolve(ret);
                }
        );
    }

    /**
     * Launch the Play Store subscription purchase sheet for the given SKU.
     * The result is delivered asynchronously via the purchaseCompleted /
     * purchaseFailed events.
     */
    @PluginMethod
    public void purchase(PluginCall call) {
        String sku = call.getString("sku");
        if (sku == null || sku.isEmpty()) {
            call.reject("sku is required");
            return;
        }

        bridge.saveCall(call);

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(sku)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
        );

        billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                (billingResult, productDetailsList) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                            || productDetailsList.isEmpty()) {
                        call.reject("Product not found: " + sku);
                        return;
                    }

                    ProductDetails productDetails = productDetailsList.get(0);
                    List<ProductDetails.SubscriptionOfferDetails> offers =
                            productDetails.getSubscriptionOfferDetails();
                    if (offers == null || offers.isEmpty()) {
                        call.reject("No subscription offers available for: " + sku);
                        return;
                    }

                    String offerToken = offers.get(0).getOfferToken();

                    List<BillingFlowParams.ProductDetailsParams> detailsParams = new ArrayList<>();
                    detailsParams.add(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                    .setProductDetails(productDetails)
                                    .setOfferToken(offerToken)
                                    .build()
                    );

                    BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                            .setProductDetailsParamsList(detailsParams)
                            .build();

                    Activity activity = getActivity();
                    BillingResult launchResult =
                            billingClient.launchBillingFlow(activity, billingFlowParams);

                    if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Failed to launch billing flow: "
                                + launchResult.getDebugMessage());
                    }
                    // Outcome delivered via onPurchasesUpdated → purchaseCompleted/purchaseFailed
                }
        );
    }

    /** Query all currently active subscriptions (for restoring purchases). */
    @PluginMethod
    public void restorePurchases(PluginCall call) {
        billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder()
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build(),
                (billingResult, purchases) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Restore failed: " + billingResult.getDebugMessage());
                        return;
                    }

                    JSArray purchaseArray = new JSArray();
                    for (Purchase purchase : purchases) {
                        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                            JSObject p = new JSObject();
                            p.put("orderId", purchase.getOrderId());
                            p.put("purchaseToken", purchase.getPurchaseToken());
                            p.put("purchaseTime", purchase.getPurchaseTime());

                            JSArray productsArray = new JSArray();
                            for (String pid : purchase.getProducts()) {
                                productsArray.put(pid);
                            }
                            p.put("products", productsArray);
                            purchaseArray.put(p);

                            acknowledgePurchaseIfNeeded(purchase);
                        }
                    }

                    JSObject ret = new JSObject();
                    ret.put("purchases", purchaseArray);
                    call.resolve(ret);
                }
        );
    }

    // ── PurchasesUpdatedListener ─────────────────────────────────────────────

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        JSObject event = new JSObject();

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                && purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    acknowledgePurchaseIfNeeded(purchase);

                    JSArray productsArray = new JSArray();
                    for (String pid : purchase.getProducts()) {
                        productsArray.put(pid);
                    }

                    event.put("success", true);
                    event.put("purchaseToken", purchase.getPurchaseToken());
                    event.put("orderId", purchase.getOrderId());
                    event.put("products", productsArray);
                    notifyListeners("purchaseCompleted", event, true);
                }
            }
        } else if (billingResult.getResponseCode()
                == BillingClient.BillingResponseCode.USER_CANCELED) {
            event.put("success", false);
            event.put("cancelled", true);
            event.put("error", "Purchase cancelled by user");
            notifyListeners("purchaseFailed", event, true);
        } else {
            event.put("success", false);
            event.put("cancelled", false);
            event.put("error", billingResult.getDebugMessage());
            notifyListeners("purchaseFailed", event, true);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void acknowledgePurchaseIfNeeded(Purchase purchase) {
        if (!purchase.isAcknowledged()) {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();
            billingClient.acknowledgePurchase(params, result -> {
                // Acknowledged; Play Store will now mark the purchase as permanent
            });
        }
    }
}
