import type { ClassroomDocument } from "../src/model/classroom";
import {
  applyClassroomAction,
  ensureDocument,
  type AddStudentPayload,
  type ClassroomAction,
  type CreateAssignmentPayload,
  type CreateClassroomPayload,
  type RecordProgressPayload,
} from "../src/services/classroomMutations";

export const config = {
  runtime: "edge",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const keyForTeacher = (teacherId: string) => `classroom:${teacherId}`;

// ---------------------------------------------------------------------------
// Minimal Upstash-compatible KV helpers.
//
// Set CLASSROOM_KV_URL and CLASSROOM_KV_TOKEN in Vercel → Settings →
// Environment Variables (plain, non-shared vars).  When these are absent the
// endpoint returns 503 and the client falls back to localStorage.
// ---------------------------------------------------------------------------

const KV_URL = process.env.CLASSROOM_KV_URL;
const KV_TOKEN = process.env.CLASSROOM_KV_TOKEN;

function kvConfigured(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
}

async function kvGet(key: string): Promise<string | null> {
  if (!KV_URL || !KV_TOKEN) throw new Error("CLASSROOM_KV_URL / CLASSROOM_KV_TOKEN are not set");
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV GET failed: ${res.status}`);
  const data = (await res.json()) as { result: string | null };
  return data.result;
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!KV_URL || !KV_TOKEN) throw new Error("CLASSROOM_KV_URL / CLASSROOM_KV_TOKEN are not set");
  // Use the pipeline endpoint so arbitrary JSON values are safe in the body.
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([["set", key, value]]),
  });
  if (!res.ok) throw new Error(`KV SET failed: ${res.status}`);
}

type ClassroomRequest =
  | { action: "load"; teacherId: string }
  | { action: "createClass"; teacherId: string; payload: CreateClassroomPayload }
  | { action: "addStudent"; teacherId: string; payload: AddStudentPayload }
  | { action: "createAssignment"; teacherId: string; payload: CreateAssignmentPayload }
  | { action: "recordProgress"; teacherId: string; payload: RecordProgressPayload }
  | { action: "refreshAnalytics"; teacherId: string; payload: { classId: string } };

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!kvConfigured()) {
    // CLASSROOM_KV_URL / CLASSROOM_KV_TOKEN not set — the client will fall back
    // to localStorage automatically.
    return new Response("Classroom KV not configured", { status: 503, headers: corsHeaders });
  }

  try {
    const payload = (await request.json()) as ClassroomRequest | null;
    if (!payload?.teacherId) {
      return new Response("Missing teacherId", { status: 400, headers: corsHeaders });
    }

    const document = await readDocument(payload.teacherId);
    if (payload.action === "load") {
      return respond(document);
    }

    const action = mapAction(payload);
    if (!action) {
      return new Response("Unknown classroom action", { status: 400, headers: corsHeaders });
    }

    const updated = applyClassroomAction(document, action);
    await writeDocument(payload.teacherId, updated);
    return respond(updated);
  } catch (error) {
    console.error("[Classroom] handler error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500, headers: corsHeaders });
  }
}

const readDocument = async (teacherId: string): Promise<ClassroomDocument> => {
  const raw = await kvGet(keyForTeacher(teacherId));
  if (!raw) {
    return ensureDocument(null, teacherId);
  }

  try {
    const parsed = JSON.parse(raw) as ClassroomDocument;
    return ensureDocument(parsed, teacherId);
  } catch (error) {
    console.warn("[Classroom] readDocument parse fallback", error);
    return ensureDocument(null, teacherId);
  }
};

const writeDocument = async (teacherId: string, document: ClassroomDocument) => {
  await kvSet(keyForTeacher(teacherId), JSON.stringify(document));
};

const mapAction = (request: ClassroomRequest): ClassroomAction | null => {
  switch (request.action) {
    case "createClass":
      return { type: "createClass", teacherId: request.teacherId, payload: request.payload };
    case "addStudent":
      return { type: "addStudent", teacherId: request.teacherId, payload: request.payload };
    case "createAssignment":
      return { type: "createAssignment", teacherId: request.teacherId, payload: request.payload };
    case "recordProgress":
      return { type: "recordProgress", teacherId: request.teacherId, payload: request.payload };
    case "refreshAnalytics":
      return { type: "refreshAnalytics", teacherId: request.teacherId, payload: request.payload };
    default:
      return null;
  }
};

const respond = (document: ClassroomDocument) =>
  new Response(JSON.stringify(document), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
