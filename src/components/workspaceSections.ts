export const WORKSPACE_SECTION_IDS = [
  "arcade",
  "classroom",
  "community",
  "account",
  "pricing",
] as const;

export type WorkspaceSectionId = (typeof WORKSPACE_SECTION_IDS)[number];

export const isWorkspaceSectionId = (
  value: string | null | undefined,
): value is WorkspaceSectionId =>
  typeof value === "string" &&
  (WORKSPACE_SECTION_IDS as readonly string[]).includes(value);
