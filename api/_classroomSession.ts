const COOKIE_NAME = "ct3d_classroom_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SESSION_VERSION = 1 as const;
const TEACHER_ID_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;
const DEV_SESSION_SECRET = "dev-classroom-session-secret-change-me";

type SessionPayload = {
  version: typeof SESSION_VERSION;
  teacherId: string;
  issuedAt: number;
  expiresAt: number;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const getSessionSecret = () =>
  (typeof process !== "undefined" && process?.env?.CLASSROOM_SESSION_SECRET) || DEV_SESSION_SECRET;

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string): Uint8Array | null => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = `${normalized}${"=".repeat(padLength)}`;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
};

const getSigningKey = async (): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

const signTokenPayload = async (payloadPart: string): Promise<string> => {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payloadPart));
  return toBase64Url(new Uint8Array(signature));
};

const encodeSessionToken = async (teacherId: string): Promise<string> => {
  const now = Date.now();
  const payload: SessionPayload = {
    version: SESSION_VERSION,
    teacherId,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payloadPart = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signaturePart = await signTokenPayload(payloadPart);
  return `${payloadPart}.${signaturePart}`;
};

const decodeSessionToken = async (token: string): Promise<SessionPayload | null> => {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = await signTokenPayload(payloadPart);
  if (expectedSignature !== signaturePart) {
    return null;
  }

  const payloadBytes = fromBase64Url(payloadPart);
  if (!payloadBytes) {
    return null;
  }

  try {
    const parsed = JSON.parse(textDecoder.decode(payloadBytes)) as Partial<SessionPayload>;
    if (
      parsed?.version !== SESSION_VERSION ||
      typeof parsed.teacherId !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    if (!TEACHER_ID_PATTERN.test(parsed.teacherId)) {
      return null;
    }
    if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()) {
      return null;
    }

    return {
      version: SESSION_VERSION,
      teacherId: parsed.teacherId,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
};

const parseCookies = (request: Request): Map<string, string> => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return new Map();
  }

  return new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split("=");
        return [name, rest.join("=")] as const;
      })
  );
};

const createTeacherId = () => `teacher-${crypto.randomUUID()}`;

export const parseTeacherId = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return TEACHER_ID_PATTERN.test(trimmed) ? trimmed : null;
};

export const readSessionTeacherId = async (request: Request): Promise<string | null> => {
  const token = parseCookies(request).get(COOKIE_NAME);
  if (!token) {
    return null;
  }

  const payload = await decodeSessionToken(token);
  return payload?.teacherId ?? null;
};

export const createSessionCookie = async (
  request: Request,
  preferredTeacherId?: string | null
): Promise<{ teacherId: string; setCookie: string }> => {
  const teacherId = parseTeacherId(preferredTeacherId) ?? createTeacherId();
  const token = await encodeSessionToken(teacherId);
  const isSecure = new URL(request.url).protocol === "https:";

  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    isSecure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return { teacherId, setCookie: cookie };
};

const getAllowedOrigins = (): string[] => {
  if (typeof process === "undefined" || !process?.env?.CLASSROOM_ALLOWED_ORIGINS) {
    return [];
  }
  return process.env.CLASSROOM_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const corsHeadersForRequest = (request: Request): Record<string, string> => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const requestOrigin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }

  return headers;
};

