import { buildInfo, formatBuildTime } from "../utils/buildInfo";

export default function BuildStamp() {
  const buildTime = formatBuildTime(buildInfo.time);
  const labelParts = [buildInfo.shortSha, buildInfo.ref, buildTime].filter(Boolean);
  const titleParts = [buildInfo.sha, buildInfo.ref, buildInfo.time].filter(Boolean);

  return (
    <div
      className="build-stamp"
      aria-label="Build information"
      title={titleParts.join(" | ")}
    >
      <span className="build-stamp__label">Build</span>
      <span className="build-stamp__value">{labelParts.join(" | ")}</span>
    </div>
  );
}
