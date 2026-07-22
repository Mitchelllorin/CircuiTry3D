package com.circuitry3d.app;

import android.app.Activity;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.UnfetchedProduct;

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
 *   initialize()             — connect the BillingClient
 *   getProducts(skus)        — query subscription product details
 *   getInAppProducts(skus)   — query one-time in-app product details (e.g. premium_unlock)
 *   purchase(sku)            — launch the Play Store subscription flow
 *   purchaseInApp(sku)       — launch the Play Store one-time purchase flow
 *   restorePurchases()       — query all active subscriptions
 *   restoreInAppPurchases()  — query all purchased one-time products
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
        // Wrap in try/catch so that any error constructing the BillingClient
        // (e.g. on devices without Google Play Services) does not propagate as
        // an uncaught exception through Capacitor's plugin loader and crash the
        // entire app before the WebView has rendered.
        try {
            billingClient = BillingClient.newBuilder(getContext())
                    .setListener(this)
                    // Billing Library 8 removed the no-arg enablePendingPurchases().
                    // We sell one-time products (premium_unlock), so opt those in.
                    .enablePendingPurchases(
                            PendingPurchasesParams.newBuilder()
                                    .enableOneTimeProducts()
                                    .build()
                    )
                    .build();
        } catch (Exception e) {
            android.util.Log.w("BillingPlugin", "Failed to create BillingClient - billing will be unavailable", e);
            billingClient = null;
        }
    }

    /** Connect the billing client. Must be called before any other method. */
    @PluginMethod
    public void initialize(PluginCall call) {
        if (billingClient == null) {
            call.reject("Billing is not available on this device");
            return;
        }
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

    /**
     * Query Play Store for subscription product details by SKU list.
     * Returns price, currency, and offer token for each subscription product.
     */
    @PluginMethod
    public void getProducts(PluginCall call) {
        if (billingClient == null) {
            call.reject("Billing is not available on this device");
            return;
        }
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
                (billingResult, queryResult) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Product query failed: " + billingResult.getDebugMessage());
                        return;
                    }

                    List<ProductDetails> productDetailsList = queryResult.getProductDetailsList();
                    logUnfetched("getProducts", queryResult);

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
     * Query Play Store for one-time in-app product details by SKU list.
     * Used to fetch localised prices for INAPP products (e.g. premium_unlock)
     * so the pricing page can display real, region-adjusted prices.
     *
     * Returns the same shape as getProducts() so callers can handle both uniformly.
     */
    @PluginMethod
    public void getInAppProducts(PluginCall call) {
        if (billingClient == null) {
            call.reject("Billing is not available on this device");
            return;
        }
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
                                .setProductType(BillingClient.ProductType.INAPP)
                                .build()
                );
            }
        } catch (Exception e) {
            call.reject("Invalid skus: " + e.getMessage());
            return;
        }

        billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                (billingResult, queryResult) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("In-app product query failed: " + billingResult.getDebugMessage());
                        return;
                    }

                    List<ProductDetails> productDetailsList = queryResult.getProductDetailsList();
                    logUnfetched("getInAppProducts", queryResult);

                    JSArray resultArray = new JSArray();
                    for (ProductDetails detail : productDetailsList) {
                        JSObject item = new JSObject();
                        item.put("productId", detail.getProductId());
                        item.put("title", detail.getTitle());
                        item.put("description", detail.getDescription());

                        // One-time products expose price via getOneTimePurchaseOfferDetails()
                        ProductDetails.OneTimePurchaseOfferDetails oneTime =
                                detail.getOneTimePurchaseOfferDetails();
                        if (oneTime != null) {
                            item.put("price", oneTime.getFormattedPrice());
                            item.put("priceMicros", oneTime.getPriceAmountMicros());
                            item.put("currencyCode", oneTime.getPriceCurrencyCode());
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
        if (billingClient == null) {
            call.reject("Billing is not available on this device");
            return;
        }
        String sku = call.getString("sku");
        if (sku == null || sku.isEmpty()) {
            call.reject("sku is required");
            return;
        }

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(sku)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
        );

        billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                (billingResult, queryResult) -> {
                    List<ProductDetails> productDetailsList = queryResult.getProductDetailsList();
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                            || productDetailsList.isEmpty()) {
                        logUnfetched("purchase", queryResult);
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
                    } else {
                        // Flow launched successfully. The actual purchase outcome is
                        // delivered asynchronously via onPurchasesUpdated →
                        // purchaseCompleted / purchaseFailed events. Resolve now so the
                        // JS `await purchase()` promise settles instead of hanging.
                        call.resolve();
                    }
                }
        );
    }

    /**
     * Launch the Play Store one-time in-app purchase sheet for the given SKU.
     * The result is delivered asynchronously via the purchaseCompleted /
     * purchaseFailed events.
     */
    @PluginMethod
    public void purchaseInApp(PluginCall call) {
        if (billingClient == null) {
            call.reject("Billing is not available on this device");
            return;
        }
        String sku = call.getString("sku");
        if (sku == null || sku.isEmpty()) {
            call.reject("sku is required");
            return;
        }

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(sku)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
        );

        billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                (billingResult, queryResult) -> {
                    List<ProductDetails> productDetailsList = queryResult.getProductDetailsList();
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                            || productDetailsList.isEmpty()) {
                        logUnfetched("purchaseInApp", queryResult);
                        call.reject("Product not found: " + sku);
                        return;
                    }

                    ProductDetails productDetails = productDetailsList.get(0);

                    List<BillingFlowParams.ProductDetailsParams> detailsParams = new ArrayList<>();
                    detailsParams.add(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                    .setProductDetails(productDetails)
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
                    } else {
                        // Flow launched successfully. The actual purchase outcome is
                        // delivered asynchronously via onPurchasesUpdated →
                        // purchaseCompleted / purchaseFailed events. Resolve now so the
                        // JS `await purchaseInApp()` promise settles instead of hanging.
                        call.resolve();
                    }
                }
        );
    }

    /** Query all currently active subscriptions (for restoring purchases). */
    @PluginMethod
    public void restorePurchases(PluginCall call) {
        if (billingClient == null) {
            call.reject("Billing is not available on this device");
            return;
        }
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

    /** Query all previously purchased one-time in-app products (for restoring). */
    @PluginMethod
    public void restoreInAppPurchases(PluginCall call) {
        if (billingClient == null) {
            call.reject("Billing is not available on this device");
            return;
        }
        billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder()
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build(),
                (billingResult, purchases) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Restore in-app failed: " + billingResult.getDebugMessage());
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

    /**
     * Billing Library 8 reports products it could NOT fetch instead of silently
     * omitting them. Log them — an unfetched SKU almost always means the product
     * is missing/inactive in the Play Console, which is otherwise invisible.
     */
    private void logUnfetched(String source, QueryProductDetailsResult queryResult) {
        List<UnfetchedProduct> unfetched = queryResult.getUnfetchedProductList();
        if (unfetched == null || unfetched.isEmpty()) {
            return;
        }
        for (UnfetchedProduct product : unfetched) {
            android.util.Log.w("BillingPlugin", source + ": could not fetch product "
                    + product.getProductId() + " (status " + product.getStatusCode() + ")");
        }
    }

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
