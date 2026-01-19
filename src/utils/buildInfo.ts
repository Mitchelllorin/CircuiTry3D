type BuildInfo = {
  sha: string;
  shortSha: string;
  ref: string;
  time: string;
};

const rawSha = typeof __BUILD_SHA__ === "string" ? __BUILD_SHA__ : "dev";
const rawRef = typeof __BUILD_REF__ === "string" ? __BUILD_REF__ : "local";
const rawTime = typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "";

export const buildInfo: BuildInfo = {
  sha: rawSha,
  shortSha: rawSha && rawSha !== "dev" ? rawSha.slice(0, 7) : "dev",
  ref: rawRef,
  time: rawTime,
};

export const formatBuildTime = (value: string) => {
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
};
