import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

export type WorkspaceSkinPresetId =
  | "default"
  | "aurora"
  | "blueprint"
  | "sunset"
  | "midnight";

export type WorkspaceSkinId = WorkspaceSkinPresetId | "custom";

export type WorkspaceSkinOption = {
  id: WorkspaceSkinPresetId;
  label: string;
  description: string;
  overlay: string;
  preview: string;
  blendMode: CSSProperties["mixBlendMode"];
  opacity: number;
};

type WorkspaceBackgroundState = {
  activeSkinId: WorkspaceSkinId;
  customImageDataUrl: string | null;
  customImageName: string | null;
  customImageOpacity: number;
};

const WORKSPACE_SKIN_STORAGE_KEY = "builder:workspace-skin";
const MAX_CUSTOM_SKIN_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const DEFAULT_WORKSPACE_BACKGROUND_STATE: WorkspaceBackgroundState = {
  activeSkinId: "default",
  customImageDataUrl: null,
  customImageName: null,
  customImageOpacity: 62,
};

const WORKSPACE_SKIN_OPTIONS: WorkspaceSkinOption[] = [
  {
    id: "default",
    label: "Classic",
    description: "The standard workspace look.",
    overlay: "none",
    preview: "linear-gradient(135deg, #0f1b3d, #16213e 52%, #0a1028)",
    blendMode: "normal",
    opacity: 0,
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Cool green and cyan glow.",
    overlay:
      "radial-gradient(circle at 14% 20%, rgba(0, 255, 163, 0.62), transparent 48%), radial-gradient(circle at 84% 72%, rgba(70, 160, 255, 0.56), transparent 52%), linear-gradient(140deg, rgba(8, 18, 38, 0.38), rgba(4, 10, 24, 0.66))",
    preview:
      "radial-gradient(circle at 20% 20%, rgba(0, 255, 163, 0.78), transparent 44%), radial-gradient(circle at 84% 72%, rgba(70, 160, 255, 0.76), transparent 50%), linear-gradient(140deg, #0a1430, #081024 70%)",
    blendMode: "screen",
    opacity: 0.42,
  },
  {
    id: "blueprint",
    label: "Blueprint",
    description: "Technical grid drafting style.",
    overlay:
      "repeating-linear-gradient(0deg, rgba(123, 197, 255, 0.12), rgba(123, 197, 255, 0.12) 1px, transparent 1px, transparent 34px), repeating-linear-gradient(90deg, rgba(123, 197, 255, 0.12), rgba(123, 197, 255, 0.12) 1px, transparent 1px, transparent 34px), linear-gradient(135deg, rgba(7, 34, 74, 0.72), rgba(5, 18, 44, 0.55))",
    preview:
      "repeating-linear-gradient(0deg, rgba(123, 197, 255, 0.18), rgba(123, 197, 255, 0.18) 1px, transparent 1px, transparent 22px), repeating-linear-gradient(90deg, rgba(123, 197, 255, 0.18), rgba(123, 197, 255, 0.18) 1px, transparent 1px, transparent 22px), linear-gradient(140deg, #0b2f68, #071f45 72%)",
    blendMode: "soft-light",
    opacity: 0.46,
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm amber and magenta tint.",
    overlay:
      "radial-gradient(circle at 82% 16%, rgba(255, 150, 68, 0.56), transparent 48%), radial-gradient(circle at 20% 84%, rgba(255, 99, 164, 0.5), transparent 52%), linear-gradient(135deg, rgba(24, 8, 44, 0.52), rgba(50, 12, 62, 0.44))",
    preview:
      "radial-gradient(circle at 82% 16%, rgba(255, 150, 68, 0.74), transparent 44%), radial-gradient(circle at 20% 84%, rgba(255, 99, 164, 0.68), transparent 50%), linear-gradient(135deg, #260a44, #46105f)",
    blendMode: "overlay",
    opacity: 0.4,
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep dark cinematic contrast.",
    overlay:
      "radial-gradient(circle at 50% -12%, rgba(94, 128, 255, 0.28), transparent 56%), radial-gradient(circle at 50% 122%, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.26) 42%, transparent 72%), linear-gradient(180deg, rgba(2, 6, 18, 0.7), rgba(2, 4, 12, 0.95))",
    preview:
      "radial-gradient(circle at 50% -12%, rgba(94, 128, 255, 0.42), transparent 56%), linear-gradient(180deg, #080d22, #030710)",
    blendMode: "multiply",
    opacity: 0.5,
  },
];

const PRESET_ID_SET = new Set<WorkspaceSkinPresetId>(
  WORKSPACE_SKIN_OPTIONS.map((skin) => skin.id),
);

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read file."));
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });

const parseStoredWorkspaceBackground = (
  raw: string | null,
): WorkspaceBackgroundState => {
  if (!raw) {
    return DEFAULT_WORKSPACE_BACKGROUND_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceBackgroundState>;
    const parsedSkinId =
      parsed.activeSkinId === "custom" ||
      (typeof parsed.activeSkinId === "string" &&
        PRESET_ID_SET.has(parsed.activeSkinId as WorkspaceSkinPresetId))
        ? parsed.activeSkinId
        : DEFAULT_WORKSPACE_BACKGROUND_STATE.activeSkinId;
    const customImageDataUrl =
      typeof parsed.customImageDataUrl === "string" &&
      parsed.customImageDataUrl.startsWith("data:image/")
        ? parsed.customImageDataUrl
        : null;
    const customImageName =
      typeof parsed.customImageName === "string" &&
      parsed.customImageName.trim().length > 0
        ? parsed.customImageName.trim()
        : null;
    const customImageOpacity = clamp(
      typeof parsed.customImageOpacity === "number"
        ? parsed.customImageOpacity
        : DEFAULT_WORKSPACE_BACKGROUND_STATE.customImageOpacity,
      20,
      100,
    );
    const activeSkinId =
      parsedSkinId === "custom" && !customImageDataUrl ? "default" : parsedSkinId;

    return {
      activeSkinId,
      customImageDataUrl,
      customImageName,
      customImageOpacity,
    };
  } catch {
    return DEFAULT_WORKSPACE_BACKGROUND_STATE;
  }
};

export function useWorkspaceBackground() {
  const [workspaceBackgroundState, setWorkspaceBackgroundState] =
    useState<WorkspaceBackgroundState>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_WORKSPACE_BACKGROUND_STATE;
      }
      return parseStoredWorkspaceBackground(
        window.localStorage.getItem(WORKSPACE_SKIN_STORAGE_KEY),
      );
    });
  const [isWorkspaceSkinOpen, setWorkspaceSkinOpen] = useState(false);
  const [workspaceSkinError, setWorkspaceSkinError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        WORKSPACE_SKIN_STORAGE_KEY,
        JSON.stringify(workspaceBackgroundState),
      );
    } catch {
      setWorkspaceSkinError(
        "Unable to save this skin in browser storage. Try a smaller image.",
      );
    }
  }, [workspaceBackgroundState]);

  const activePreset = useMemo(
    () =>
      WORKSPACE_SKIN_OPTIONS.find(
        (skin) => skin.id === workspaceBackgroundState.activeSkinId,
      ) ?? WORKSPACE_SKIN_OPTIONS[0],
    [workspaceBackgroundState.activeSkinId],
  );

  const workspaceSkinStyle = useMemo<CSSProperties>(() => {
    if (
      workspaceBackgroundState.activeSkinId === "custom" &&
      workspaceBackgroundState.customImageDataUrl
    ) {
      return {
        backgroundImage: `url("${workspaceBackgroundState.customImageDataUrl}")`,
        mixBlendMode: "normal",
        opacity: clamp(workspaceBackgroundState.customImageOpacity, 20, 100) / 100,
      };
    }

    return {
      backgroundImage: activePreset.overlay,
      mixBlendMode: activePreset.blendMode,
      opacity: activePreset.opacity,
    };
  }, [activePreset, workspaceBackgroundState]);

  const selectWorkspaceSkin = useCallback((skinId: WorkspaceSkinId) => {
    setWorkspaceBackgroundState((previous) => {
      if (skinId === "custom" && !previous.customImageDataUrl) {
        return previous;
      }
      return {
        ...previous,
        activeSkinId: skinId,
      };
    });
    setWorkspaceSkinError((currentError) => {
      if (skinId === "custom" && !workspaceBackgroundState.customImageDataUrl) {
        return "Import an image first before selecting Custom.";
      }
      return currentError?.startsWith("Import an image first")
        ? null
        : currentError;
    });
  }, [workspaceBackgroundState.customImageDataUrl]);

  const importWorkspaceSkinFromFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setWorkspaceSkinError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_CUSTOM_SKIN_FILE_SIZE_BYTES) {
      setWorkspaceSkinError("Image is too large. Please keep it under 2 MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setWorkspaceBackgroundState((previous) => ({
        ...previous,
        activeSkinId: "custom",
        customImageDataUrl: dataUrl,
        customImageName: file.name,
      }));
      setWorkspaceSkinError(null);
    } catch {
      setWorkspaceSkinError("Could not import that image. Please try another file.");
    }
  }, []);

  const setCustomWorkspaceSkinOpacity = useCallback((value: number) => {
    setWorkspaceBackgroundState((previous) => ({
      ...previous,
      customImageOpacity: clamp(value, 20, 100),
    }));
  }, []);

  const clearCustomWorkspaceSkin = useCallback(() => {
    setWorkspaceBackgroundState((previous) => ({
      ...previous,
      activeSkinId:
        previous.activeSkinId === "custom"
          ? DEFAULT_WORKSPACE_BACKGROUND_STATE.activeSkinId
          : previous.activeSkinId,
      customImageDataUrl: null,
      customImageName: null,
    }));
    setWorkspaceSkinError(null);
  }, []);

  const resetWorkspaceSkin = useCallback(() => {
    setWorkspaceBackgroundState(DEFAULT_WORKSPACE_BACKGROUND_STATE);
    setWorkspaceSkinError(null);
  }, []);

  return {
    workspaceSkinOptions: WORKSPACE_SKIN_OPTIONS,
    workspaceSkinStyle,
    isWorkspaceSkinOpen,
    setWorkspaceSkinOpen,
    activeWorkspaceSkinId: workspaceBackgroundState.activeSkinId,
    customWorkspaceSkinName: workspaceBackgroundState.customImageName,
    customWorkspaceSkinOpacity: workspaceBackgroundState.customImageOpacity,
    hasCustomWorkspaceSkin: Boolean(workspaceBackgroundState.customImageDataUrl),
    workspaceSkinError,
    selectWorkspaceSkin,
    importWorkspaceSkinFromFile,
    setCustomWorkspaceSkinOpacity,
    clearCustomWorkspaceSkin,
    resetWorkspaceSkin,
  };
}
