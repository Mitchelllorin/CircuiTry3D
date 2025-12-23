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
  label = "CircuiTry3D",
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
      <span className="circuitry-wordmark__circui">Circui</span>
      <span className="circuitry-wordmark__try">Try</span>
      <span className="circuitry-wordmark__3d">3D</span>
    </span>
  );
}

