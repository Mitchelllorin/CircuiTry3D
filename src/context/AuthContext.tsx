import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { isLifetimeTester } from "../utils/lifetimeTesterEmails";
import { getStoredTier, setStoredTier } from "../utils/playStoreBilling";

// ── Password hashing (PBKDF2-SHA256) ────────────────────────────────────────

const HASH_PREFIX = "pbkdf2v1";
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_BITS = 256;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const hexToBytes = (hex: string): Uint8Array =>
  new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));

const hashPassword = async (password: string): Promise<string> => {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return password; // Fallback for non-HTTPS / test environments
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    PBKDF2_KEY_BITS
  );
  return `${HASH_PREFIX}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
};

const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  if (!stored.startsWith(`${HASH_PREFIX}$`)) {
    return password === stored; // Legacy plaintext comparison
  }
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return false;
  }
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [, saltHex, expectedHex] = parts;
  const salt = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    PBKDF2_KEY_BITS
  );
  return bytesToHex(new Uint8Array(bits)) === expectedHex;
};

type AuthStorageSchema = {
  users: StoredUser[];
  currentUserId: string | null;
  lastSignedInUserId: string | null;
};

export type StoredUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  avatarColor: string;
  bio?: string;
  pin?: string;
  createdAt: number;
};

export type AuthUser = Omit<StoredUser, "password" | "pin">;

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
  lastSignedInUser: AuthUser | null;
  hasPIN: boolean;
  users: AuthUser[];
  loading: boolean;
  signUp: (payload: SignUpPayload) => Promise<AuthResult>;
  signIn: (payload: SignInPayload) => Promise<AuthResult>;
  signOut: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthResult>;
  getUserById: (id: string) => AuthUser | null;
  resetPassword: (email: string, newPassword: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  setPIN: (pin: string) => Promise<AuthResult>;
  clearPIN: () => Promise<AuthResult>;
  signInWithPIN: (pin: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
};

const STORAGE_KEY = "circuiTry3d.auth.v1";

const DEFAULT_STORAGE: AuthStorageSchema = {
  users: [
    {
      id: "sample-mentor",
      email: "mentor@circuitry3d.dev",
      password: "mentor",
      displayName: "Arena Mentor",
      avatarColor: "#6366f1",
      bio: "Here to help you tune your builds and answer questions about circuit physics.",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    },
    {
      id: "sample-builder",
      email: "builder@circuitry3d.dev",
      password: "builder",
      displayName: "Prototype Builder",
      avatarColor: "#f97316",
      bio: "Sharing weekly builds from the Component Arena bench.",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    },
  ],
  currentUserId: null,
  lastSignedInUserId: null,
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
    const users = Array.isArray(parsed.users) ? (parsed.users.filter((user): user is StoredUser => Boolean(user && user.id && user.email && user.password && user.displayName)) as StoredUser[]) : DEFAULT_STORAGE.users;
    const currentUserId = typeof parsed.currentUserId === "string" ? parsed.currentUserId : null;
    const lastSignedInUserId = typeof parsed.lastSignedInUserId === "string" ? parsed.lastSignedInUserId : null;
    return { users, currentUserId, lastSignedInUserId };
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
  const { password: _password, pin: _pin, ...rest } = user;
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

  const currentUser = useMemo(() => buildAuthUser(state.users.find((user) => user.id === state.currentUserId)), [state.users, state.currentUserId]);

  const lastSignedInUser = useMemo(() => buildAuthUser(state.users.find((user) => user.id === state.lastSignedInUserId)), [state.users, state.lastSignedInUserId]);

  const hasPIN = useMemo(() => {
    if (!state.lastSignedInUserId) return false;
    const user = state.users.find((u) => u.id === state.lastSignedInUserId);
    return Boolean(user?.pin);
  }, [state.users, state.lastSignedInUserId]);

  const users = useMemo(() => state.users.map((user) => buildAuthUser(user)).filter((user): user is AuthUser => Boolean(user)), [state.users]);

  // Grant lifetime tier retroactively for any signed-in founding tester.
  useEffect(() => {
    if (currentUser && isLifetimeTester(currentUser.email) && getStoredTier() !== "lifetime") {
      setStoredTier("lifetime");
    }
  }, [currentUser]);

  useEffect(() => {
    if (!initialisedRef.current) {
      return;
    }
    writeStorage(state);
  }, [state]);

  const getUserById = useCallback(
    (id: string) => {
      const snapshot = stateSnapshotRef.current;
      const match = snapshot.users.find((user) => user.id === id);
      return buildAuthUser(match) ?? null;
    },
    []
  );

  const signUp = useCallback(async (payload: SignUpPayload): Promise<AuthResult> => {
    const snapshot = stateSnapshotRef.current;
    const email = payload.email.trim().toLowerCase();
    const displayName = payload.displayName.trim();
    const password = payload.password;

    if (!email || !displayName || !password.trim()) {
      return { ok: false, reason: "unknown", message: "Please provide an email, password, and display name." };
    }

    if (password.length < 8) {
      return { ok: false, reason: "unknown", message: "Password must be at least 8 characters." };
    }

    const emailTaken = snapshot.users.some((user) => user.email.toLowerCase() === email);
    if (emailTaken) {
      return { ok: false, reason: "email-in-use", message: "That email is already registered." };
    }

    const id = typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto ? globalThis.crypto.randomUUID() : `user-${Date.now()}`;

    const hashedPassword = await hashPassword(password);

    const nextUser: StoredUser = {
      id,
      email,
      password: hashedPassword,
      displayName,
      bio: payload.bio?.trim() || undefined,
      avatarColor: generateAvatarColor(email),
      createdAt: Date.now(),
    };

    setState((previous) => ({
      users: [...previous.users, nextUser],
      currentUserId: nextUser.id,
      lastSignedInUserId: nextUser.id,
    }));

    if (isLifetimeTester(email)) {
      setStoredTier("lifetime");
    }

    return { ok: true, user: buildAuthUser(nextUser)! };
  }, []);

  const signIn = useCallback(async (payload: SignInPayload): Promise<AuthResult> => {
    const snapshot = stateSnapshotRef.current;
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;
    const match = snapshot.users.find((user) => user.email.toLowerCase() === email);

    // Always run a hash-equivalent operation regardless of whether the email exists,
    // so response timing cannot reveal whether an account is registered.
    let isValid = false;
    if (match) {
      isValid = await verifyPassword(password, match.password);
    } else {
      await hashPassword(password).catch(() => {}); // Dummy operation to equalise timing
    }

    if (!match || !isValid) {
      return { ok: false, reason: "invalid-credentials", message: "Incorrect email or password." };
    }

    // Transparently upgrade legacy plaintext password to hashed on successful sign-in
    let finalPassword = match.password;
    if (!match.password.startsWith(`${HASH_PREFIX}$`)) {
      finalPassword = await hashPassword(password);
    }

    setState((previous) => ({
      ...previous,
      users: previous.users.map((u) => (u.id === match.id ? { ...u, password: finalPassword } : u)),
      currentUserId: match.id,
      lastSignedInUserId: match.id,
    }));

    if (isLifetimeTester(email)) {
      setStoredTier("lifetime");
    }

    return { ok: true, user: buildAuthUser(match)! };
  }, []);

  const signOut = useCallback(() => {
    setState((previous) => ({
      ...previous,
      currentUserId: null,
    }));
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<AuthResult> => {
    const snapshot = stateSnapshotRef.current;
    const normalised = email.trim().toLowerCase();

    if (!normalised) {
      return { ok: false, reason: "unknown", message: "Please provide your email address." };
    }

    if (!newPassword || newPassword.length < 8) {
      return { ok: false, reason: "unknown", message: "New password must be at least 8 characters." };
    }

    const match = snapshot.users.find((user) => user.email.toLowerCase() === normalised);
    if (!match) {
      await introduceLatency(400, 800);
      return { ok: false, reason: "invalid-credentials", message: "No account found with that email address." };
    }

    const hashed = await hashPassword(newPassword);
    let updatedUser: StoredUser | null = null;
    setState((previous) => {
      const users = previous.users.map((user) => {
        if (user.id !== match.id) {
          return user;
        }
        const next: StoredUser = { ...user, password: hashed };
        updatedUser = next;
        return next;
      });
      return { ...previous, users };
    });

    return updatedUser ? { ok: true, user: buildAuthUser(updatedUser)! } : { ok: false, reason: "unknown", message: "Unable to update password." };
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
    const snapshot = stateSnapshotRef.current;
    const { currentUserId } = snapshot;
    if (!currentUserId) {
      return { ok: false, reason: "no-session", message: "You need to be signed in to change your password." };
    }

    const user = snapshot.users.find((u) => u.id === currentUserId);
    if (!user) {
      return { ok: false, reason: "unknown", message: "Unable to locate account." };
    }

    // Run verification and a minimum delay in parallel so response time is constant
    // regardless of whether the current password is correct or incorrect.
    const [isValid] = await Promise.all([
      verifyPassword(currentPassword, user.password),
      introduceLatency(300, 600),
    ]);
    if (!isValid) {
      return { ok: false, reason: "invalid-credentials", message: "Current password is incorrect." };
    }

    if (!newPassword || newPassword.length < 8) {
      return { ok: false, reason: "unknown", message: "New password must be at least 8 characters." };
    }

    const hashed = await hashPassword(newPassword);
    let updatedUser: StoredUser | null = null;
    setState((previous) => {
      const users = previous.users.map((u) => {
        if (u.id !== currentUserId) return u;
        const next: StoredUser = { ...u, password: hashed };
        updatedUser = next;
        return next;
      });
      return { ...previous, users };
    });

    return updatedUser ? { ok: true, user: buildAuthUser(updatedUser)! } : { ok: false, reason: "unknown", message: "Unable to update password." };
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

  const setPIN = useCallback(async (pin: string): Promise<AuthResult> => {
    await introduceLatency(150, 350);
    const snapshot = stateSnapshotRef.current;
    const { currentUserId } = snapshot;
    if (!currentUserId) {
      return { ok: false, reason: "no-session", message: "You need to be signed in to set a PIN." };
    }
    if (!/^\d{4}$/.test(pin)) {
      return { ok: false, reason: "unknown", message: "PIN must be exactly 4 digits." };
    }
    let resolvedUser: StoredUser | null = null;
    setState((previous) => {
      const users = previous.users.map((user) => {
        if (user.id !== currentUserId) return user;
        const updated: StoredUser = { ...user, pin };
        resolvedUser = updated;
        return updated;
      });
      return { ...previous, users };
    });
    return resolvedUser ? { ok: true, user: buildAuthUser(resolvedUser)! } : { ok: false, reason: "unknown", message: "Unable to locate account." };
  }, []);

  const clearPIN = useCallback(async (): Promise<AuthResult> => {
    await introduceLatency(150, 350);
    const snapshot = stateSnapshotRef.current;
    const { currentUserId } = snapshot;
    if (!currentUserId) {
      return { ok: false, reason: "no-session", message: "You need to be signed in to remove your PIN." };
    }
    let resolvedUser: StoredUser | null = null;
    setState((previous) => {
      const users = previous.users.map((user) => {
        if (user.id !== currentUserId) return user;
        const { pin: _pin, ...rest } = user;
        const updated = rest as StoredUser;
        resolvedUser = updated;
        return updated;
      });
      return { ...previous, users };
    });
    return resolvedUser ? { ok: true, user: buildAuthUser(resolvedUser)! } : { ok: false, reason: "unknown", message: "Unable to locate account." };
  }, []);

  const signInWithPIN = useCallback(async (pin: string): Promise<AuthResult> => {
    await introduceLatency(200, 450);
    const snapshot = stateSnapshotRef.current;
    const { lastSignedInUserId } = snapshot;
    if (!lastSignedInUserId) {
      return { ok: false, reason: "invalid-credentials", message: "No recent account found. Please sign in with your password." };
    }
    const user = snapshot.users.find((u) => u.id === lastSignedInUserId);
    if (!user || !user.pin) {
      return { ok: false, reason: "invalid-credentials", message: "No PIN is set for this account." };
    }
    if (user.pin !== pin) {
      return { ok: false, reason: "invalid-credentials", message: "Incorrect PIN." };
    }
    setState((previous) => ({
      ...previous,
      currentUserId: user.id,
      lastSignedInUserId: user.id,
    }));
    if (isLifetimeTester(user.email)) {
      setStoredTier("lifetime");
    }
    return { ok: true, user: buildAuthUser(user)! };
  }, []);

  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    await introduceLatency(200, 450);
    const snapshot = stateSnapshotRef.current;
    const { currentUserId } = snapshot;
    if (!currentUserId) {
      return { ok: false, reason: "no-session", message: "You need to be signed in to delete your account." };
    }
    const user = snapshot.users.find((u) => u.id === currentUserId);
    if (!user) {
      return { ok: false, reason: "unknown", message: "Unable to locate account." };
    }
    setState((previous) => ({
      users: previous.users.filter((u) => u.id !== currentUserId),
      currentUserId: null,
      lastSignedInUserId: null,
    }));
    return { ok: true, user: buildAuthUser(user)! };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      lastSignedInUser,
      hasPIN,
      users,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      getUserById,
      resetPassword,
      changePassword,
      setPIN,
      clearPIN,
      signInWithPIN,
      deleteAccount,
    }),
    [currentUser, lastSignedInUser, hasPIN, users, loading, signUp, signIn, signOut, updateProfile, getUserById, resetPassword, changePassword, setPIN, clearPIN, signInWithPIN, deleteAccount]
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

