import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

type AuthStorageSchema = {
  users: StoredUser[];
  currentUserId: string | null;
};

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarColor: string;
  bio?: string;
  createdAt: number;
};

type PersistedUser = Partial<Omit<StoredUser, "passwordHash">> & {
  passwordHash?: unknown;
  password?: unknown;
};

export type AuthUser = Omit<StoredUser, "password">;

export type SignUpPayload = {
  email: string;
  password: string;
  displayName: string;
  bio?: string;
};

export type SignInPayload = {
  email: string;
  password: string;
};

export type UpdateProfilePayload = Partial<Pick<StoredUser, "displayName" | "bio" | "avatarColor">>;

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "email-in-use" | "invalid-credentials" | "no-session" | "unknown"; message: string };

type AuthContextValue = {
  currentUser: AuthUser | null;
  users: AuthUser[];
  loading: boolean;
  signUp: (payload: SignUpPayload) => Promise<AuthResult>;
  signIn: (payload: SignInPayload) => Promise<AuthResult>;
  signOut: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthResult>;
  getUserById: (id: string) => AuthUser | null;
};

const STORAGE_KEY = "circuiTry3d.auth.v1";
const PASSWORD_HASH_PREFIX = "pbkdf2$";
const PASSWORD_HASH_ITERATIONS = 120000;
const SAMPLE_MENTOR_PASSWORD_HASH =
  "pbkdf2$120000$Q2lyY3VpdFRyeTMtTWVudG9yLVNhbHQ=$Egfdz2N7rk/iUvj2cX6OgdD0W5UDzEvQx2mGihRKLaY=";
const SAMPLE_BUILDER_PASSWORD_HASH =
  "pbkdf2$120000$Q2lyY3VpdFRyeTMtQnVpbGRlci1TYWx0$u5AMlG/KlAuMaMtgr9kaFhIMFAm+gaQAkYVfap7aSPY=";

const DEFAULT_STORAGE: AuthStorageSchema = {
  users: [
    {
      id: "sample-mentor",
      email: "mentor@circuitry3d.dev",
      passwordHash: SAMPLE_MENTOR_PASSWORD_HASH,
      displayName: "Arena Mentor",
      avatarColor: "#6366f1",
      bio: "Here to help you tune your builds and answer questions about circuit physics.",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    },
    {
      id: "sample-builder",
      email: "builder@circuitry3d.dev",
      passwordHash: SAMPLE_BUILDER_PASSWORD_HASH,
      displayName: "Prototype Builder",
      avatarColor: "#f97316",
      bio: "Sharing weekly builds from the Component Arena bench.",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    },
  ],
  currentUserId: null,
};

const encodeBase64 = (value: Uint8Array): string => {
  if (typeof btoa !== "function") {
    throw new Error("Base64 encoding is unavailable in this environment.");
  }
  let binary = "";
  for (let index = 0; index < value.length; index += 1) {
    binary += String.fromCharCode(value[index]);
  }
  return btoa(binary);
};

const decodeBase64 = (value: string): Uint8Array => {
  if (typeof atob !== "function") {
    throw new Error("Base64 decoding is unavailable in this environment.");
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const createRandomSalt = (length = 16): Uint8Array => {
  if (typeof globalThis.crypto !== "undefined" && "getRandomValues" in globalThis.crypto) {
    return globalThis.crypto.getRandomValues(new Uint8Array(length));
  }
  const fallback = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    fallback[index] = Math.floor(Math.random() * 256);
  }
  return fallback;
};

const isPbkdf2Hash = (value: string): boolean => value.startsWith(PASSWORD_HASH_PREFIX);

const hashPassword = async (password: string): Promise<string> => {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    return password;
  }

  const saltBytes = createRandomSalt();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hashBytes = new Uint8Array(derivedBits);
  return `${PASSWORD_HASH_PREFIX}${PASSWORD_HASH_ITERATIONS}$${encodeBase64(saltBytes)}$${encodeBase64(hashBytes)}`;
};

const verifyPassword = async (inputPassword: string, storedHash: string): Promise<boolean> => {
  // Legacy records created before hashing rollout.
  if (!isPbkdf2Hash(storedHash)) {
    return storedHash === inputPassword;
  }

  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    return false;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 4) {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = decodeBase64(parts[2]);
  const expectedHash = parts[3];
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(inputPassword),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const candidate = encodeBase64(new Uint8Array(derivedBits));
  return candidate === expectedHash;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStorage = (): AuthStorageSchema => {
  if (typeof window === "undefined") {
    return DEFAULT_STORAGE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STORAGE;
    }
    const parsed = JSON.parse(raw) as Partial<AuthStorageSchema>;
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_STORAGE;
    }
    const users = Array.isArray(parsed.users)
      ? parsed.users
          .map((candidate) => {
            const user = candidate as PersistedUser;
            if (!user || typeof user !== "object") {
              return null;
            }

            const id = typeof user.id === "string" ? user.id : null;
            const email = typeof user.email === "string" ? user.email : null;
            const displayName =
              typeof user.displayName === "string" ? user.displayName : null;
            const avatarColor =
              typeof user.avatarColor === "string"
                ? user.avatarColor
                : generateAvatarColor(email ?? undefined);
            const createdAt =
              typeof user.createdAt === "number" && Number.isFinite(user.createdAt)
                ? user.createdAt
                : Date.now();

            // Support migration from legacy plaintext `password` records.
            const passwordHash =
              typeof user.passwordHash === "string" && user.passwordHash.trim()
                ? user.passwordHash
                : typeof user.password === "string" && user.password.trim()
                ? user.password
                : null;

            if (!id || !email || !displayName || !passwordHash) {
              return null;
            }

            return {
              id,
              email,
              passwordHash,
              displayName,
              avatarColor,
              bio: typeof user.bio === "string" ? user.bio : undefined,
              createdAt,
            } satisfies StoredUser;
          })
          .filter((user): user is StoredUser => Boolean(user))
      : [];
    const currentUserId = typeof parsed.currentUserId === "string" ? parsed.currentUserId : null;
    return { users: users.length > 0 ? users : DEFAULT_STORAGE.users, currentUserId };
  } catch (error) {
    console.warn("Auth storage read failed", error);
    return DEFAULT_STORAGE;
  }
};

const writeStorage = (value: AuthStorageSchema) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn("Auth storage write failed", error);
  }
};

const buildAuthUser = (user: StoredUser | null | undefined): AuthUser | null => {
  if (!user) {
    return null;
  }
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
};

const generateAvatarColor = (seed?: string) => {
  const palette = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#22d3ee", "#14b8a6", "#facc15", "#4ade80"];
  if (!seed) {
    return palette[Math.floor(Math.random() * palette.length)];
  }
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const introduceLatency = async (minimum = 250, maximum = 600) => {
  const delay = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  await new Promise((resolve) => setTimeout(resolve, delay));
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialisedRef = useRef(false);
  const [state, setState] = useState<AuthStorageSchema>(() => readStorage());
  const [loading, setLoading] = useState(true);
  const stateSnapshotRef = useRef(state);

  useEffect(() => {
    stateSnapshotRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!initialisedRef.current) {
      if (typeof window !== "undefined") {
        setState(readStorage());
      }
      initialisedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialisedRef.current) {
      return;
    }
    writeStorage(state);
  }, [state]);

  const currentUser = useMemo(() => buildAuthUser(state.users.find((user) => user.id === state.currentUserId)), [state.users, state.currentUserId]);

  const users = useMemo(() => state.users.map((user) => buildAuthUser(user)).filter((user): user is AuthUser => Boolean(user)), [state.users]);

  const getUserById = useCallback(
    (id: string) => {
      const snapshot = stateSnapshotRef.current;
      const match = snapshot.users.find((user) => user.id === id);
      return buildAuthUser(match) ?? null;
    },
    []
  );

  const signUp = useCallback(async (payload: SignUpPayload): Promise<AuthResult> => {
    await introduceLatency();
    const snapshot = stateSnapshotRef.current;
    const email = payload.email.trim().toLowerCase();
    const displayName = payload.displayName.trim();

    if (!email || !displayName || !payload.password.trim()) {
      return { ok: false, reason: "unknown", message: "Please provide an email, password, and display name." };
    }

    const emailTaken = snapshot.users.some((user) => user.email.toLowerCase() === email);
    if (emailTaken) {
      return { ok: false, reason: "email-in-use", message: "That email is already registered." };
    }

    const id = typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto ? globalThis.crypto.randomUUID() : `user-${Date.now()}`;

    const nextUser: StoredUser = {
      id,
      email,
      passwordHash: await hashPassword(payload.password),
      displayName,
      bio: payload.bio?.trim() || undefined,
      avatarColor: generateAvatarColor(email),
      createdAt: Date.now(),
    };

    setState((previous) => ({
      users: [...previous.users, nextUser],
      currentUserId: nextUser.id,
    }));

    return { ok: true, user: buildAuthUser(nextUser)! };
  }, []);

  const signIn = useCallback(async (payload: SignInPayload): Promise<AuthResult> => {
    await introduceLatency();
    const snapshot = stateSnapshotRef.current;
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;
    const match = snapshot.users.find((user) => user.email.toLowerCase() === email);
    if (!match) {
      return { ok: false, reason: "invalid-credentials", message: "Incorrect email or password." };
    }

    const validPassword = await verifyPassword(password, match.passwordHash);
    if (!validPassword) {
      return { ok: false, reason: "invalid-credentials", message: "Incorrect email or password." };
    }

    // Opportunistically migrate legacy plaintext records to PBKDF2 on successful sign-in.
    if (!isPbkdf2Hash(match.passwordHash)) {
      const upgradedHash = await hashPassword(password);
      setState((previous) => ({
        ...previous,
        currentUserId: match.id,
        users: previous.users.map((user) =>
          user.id === match.id ? { ...user, passwordHash: upgradedHash } : user
        ),
      }));
      return {
        ok: true,
        user: buildAuthUser({ ...match, passwordHash: upgradedHash })!,
      };
    }

    setState((previous) => ({
      ...previous,
      currentUserId: match.id,
    }));

    return { ok: true, user: buildAuthUser(match)! };
  }, []);

  const signOut = useCallback(() => {
    setState((previous) => ({
      ...previous,
      currentUserId: null,
    }));
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload): Promise<AuthResult> => {
    await introduceLatency(180, 420);
    const snapshot = stateSnapshotRef.current;
    const { currentUserId } = snapshot;
    if (!currentUserId) {
      return { ok: false, reason: "no-session", message: "You need to be signed in to update your profile." };
    }

    let resolvedUser: StoredUser | null = null;
    setState((previous) => {
      const usersNext = previous.users.map((user) => {
        if (user.id !== currentUserId) {
          return user;
        }
        const updated: StoredUser = {
          ...user,
          displayName: payload.displayName?.trim() || user.displayName,
          bio: payload.bio?.trim() ?? user.bio,
          avatarColor: payload.avatarColor ?? user.avatarColor,
        };
        resolvedUser = updated;
        return updated;
      });

      return {
        ...previous,
        users: usersNext,
      };
    });

    return resolvedUser ? { ok: true, user: buildAuthUser(resolvedUser)! } : { ok: false, reason: "unknown", message: "Unable to locate account." };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      getUserById,
    }),
    [currentUser, users, loading, signUp, signIn, signOut, updateProfile, getUserById]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

