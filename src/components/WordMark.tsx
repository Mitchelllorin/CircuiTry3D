import { APP_BRAND_NAME, APP_WORDMARK_PARTS } from "../constants/branding";

type WordMarkSize = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<WordMarkSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
};

type WordMarkProps = {
  size?: WordMarkSize;
  className?: string;
  label?: string;
  decorative?: boolean;
};

export default function WordMark({
  size = "md",
  className,
  label = APP_BRAND_NAME,
  decorative = false,
}: WordMarkProps) {
  const fontSize = SIZE_MAP[size] ?? SIZE_MAP.md;

  return (
    <span
      className={["circuitry-wordmark", className].filter(Boolean).join(" ")}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      style={{ fontSize }}
    >
      <span className="circuitry-wordmark__circui">{APP_WORDMARK_PARTS.prefix}</span>
      <span className="circuitry-wordmark__try">{APP_WORDMARK_PARTS.infix}</span>
      <span className="circuitry-wordmark__3d">{APP_WORDMARK_PARTS.suffix}</span>
    </span>
  );
}

