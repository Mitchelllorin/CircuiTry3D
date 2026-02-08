import wireResourceLogo from "../../assets/wire-resource-logo.jpg";

interface WireResourceBrandProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

export function WireResourceBrand({ size = "md", showName = true }: WireResourceBrandProps) {
  const sizeMap = {
    sm: { width: 80, fontSize: 12, gap: 6 },
    md: { width: 120, fontSize: 16, gap: 8 },
    lg: { width: 160, fontSize: 20, gap: 10 },
  };

  const { width, fontSize, gap } = sizeMap[size];

  return (
    <div
      className="wire-resource-brand"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: `${gap}px`,
      }}
    >
      <img
        src={wireResourceLogo}
        alt="Wire Resource - Wire cross-sections showing copper cores and insulation"
        className="wire-resource-logo"
        style={{
          width: `${width}px`,
          height: "auto",
        }}
      />
      {showName && (
        <span
          className="wire-resource-name"
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#88ccff",
            textShadow: "0 0 10px rgba(136, 204, 255, 0.4)",
          }}
        >
          Wire Resource
        </span>
      )}
    </div>
  );
}
