import circuitLogo from "../assets/circuit-logo.svg";
import { APP_BRAND_NAME } from "../constants/branding";

type BrandMarkSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<BrandMarkSize, number> = {
  xs: 18,
  sm: 24,
  md: 32,
  lg: 44,
  xl: 64,
};

type BrandMarkProps = {
  size?: BrandMarkSize;
  withWordmark?: boolean;
  className?: string;
  imgClassName?: string;
  label?: string;
  decorative?: boolean;
};

export default function BrandMark({
  size = "md",
  withWordmark = false,
  className,
  imgClassName,
  label = APP_BRAND_NAME,
  decorative = false,
}: BrandMarkProps) {
  const pixelSize = SIZE_MAP[size] ?? SIZE_MAP.md;

  return (
    <span
      className={["circuitry-brandmark", className].filter(Boolean).join(" ")}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      <img
        className={["circuitry-brandmark__img", imgClassName].filter(Boolean).join(" ")}
        src={circuitLogo}
        width={pixelSize}
        height={pixelSize}
        alt={decorative || withWordmark ? "" : label}
        loading="eager"
        draggable={false}
      />
      {withWordmark ? <span className="circuitry-brandmark__label">{label}</span> : null}
    </span>
  );
}

