import BrandMark from "./BrandMark";
import WordMark from "./WordMark";

type BrandSignatureSize = "xs" | "sm" | "md" | "lg";
type BrandSignatureLayout = "inline" | "stacked";

type BrandSignatureProps = {
  size?: BrandSignatureSize;
  layout?: BrandSignatureLayout;
  className?: string;
  label?: string;
  decorative?: boolean;
};

export default function BrandSignature({
  size = "sm",
  layout = "inline",
  className,
  label = "CircuiTry3D",
  decorative = false,
}: BrandSignatureProps) {
  const classes = ["circuitry-brand-signature", className].filter(Boolean).join(" ");
  const dataLayout = layout === "stacked" ? "stacked" : "inline";

  return (
    <span
      className={classes}
      data-layout={dataLayout}
      data-size={size}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      <BrandMark size={size} decorative />
      <WordMark size={size} decorative />
    </span>
  );
}
