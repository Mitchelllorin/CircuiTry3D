import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type GalleryItemType = "image" | "video";

export type GalleryItem = {
  id: string;
  type: GalleryItemType;
  dataUrl: string;
  circuitName: string;
  title: string;
  description: string;
  createdAt: number;
  userId: string;
};

export type AddGalleryItemPayload = Omit<GalleryItem, "id" | "createdAt" | "userId">;

type GalleryContextValue = {
  items: GalleryItem[];
  addItem: (payload: AddGalleryItemPayload) => GalleryItem | null;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<Pick<GalleryItem, "title" | "description">>) => void;
  getItem: (id: string) => GalleryItem | undefined;
};

const STORAGE_KEY = "circuiTry3d.gallery.v1";
const MAX_ITEMS = 40;

const GalleryContext = createContext<GalleryContextValue | undefined>(undefined);

const randomId = (prefix: string) => {
  const unique =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${unique}`;
};

const readStoredItems = (): GalleryItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GalleryItem =>
        Boolean(item && item.id && item.type && item.dataUrl),
    );
  } catch {
    return [];
  }
};

const writeStoredItems = (items: GalleryItem[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage quota exceeded – silently ignore
  }
};

export function GalleryProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>(() => readStoredItems());

  useEffect(() => {
    writeStoredItems(items);
  }, [items]);

  const addItem = useCallback(
    (payload: AddGalleryItemPayload): GalleryItem | null => {
      if (!currentUser) return null;
      const item: GalleryItem = {
        id: randomId("gallery"),
        userId: currentUser.id,
        createdAt: Date.now(),
        ...payload,
      };
      setItems((prev) => [item, ...prev].slice(0, MAX_ITEMS));
      return item;
    },
    [currentUser],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<Pick<GalleryItem, "title" | "description">>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const getItem = useCallback(
    (id: string) => items.find((item) => item.id === id),
    [items],
  );

  const value = useMemo<GalleryContextValue>(
    () => ({ items, addItem, removeItem, updateItem, getItem }),
    [items, addItem, removeItem, updateItem, getItem],
  );

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("useGallery must be used within a GalleryProvider");
  return ctx;
}
