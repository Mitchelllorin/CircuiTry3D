import { kv } from "@vercel/kv";
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
import {
  corsHeadersForRequest,
  parseTeacherId,
  readSessionTeacherId,
} from "./_classroomSession";

export const config = {
  runtime: "edge",
};

const keyForTeacher = (teacherId: string) => `classroom:${teacherId}`;

type ClassroomRequest =
  | { action: "load"; teacherId?: string }
  | { action: "createClass"; teacherId?: string; payload: CreateClassroomPayload }
  | { action: "addStudent"; teacherId?: string; payload: AddStudentPayload }
  | { action: "createAssignment"; teacherId?: string; payload: CreateAssignmentPayload }
  | { action: "recordProgress"; teacherId?: string; payload: RecordProgressPayload }
  | { action: "refreshAnalytics"; teacherId?: string; payload: { classId: string } };

export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = corsHeadersForRequest(request);
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = (await request.json()) as ClassroomRequest | null;
    if (!payload?.action) {
      return new Response("Missing classroom action", { status: 400, headers: corsHeaders });
    }

    const sessionTeacherId = await readSessionTeacherId(request);
    if (!sessionTeacherId) {
      return new Response("Missing classroom session", { status: 401, headers: corsHeaders });
    }

    const requestedTeacherId = parseTeacherId(payload.teacherId);
    if (requestedTeacherId && requestedTeacherId !== sessionTeacherId) {
      return new Response("Teacher mismatch for active session", {
        status: 403,
        headers: corsHeaders,
      });
    }

    const document = await readDocument(sessionTeacherId);
    if (payload.action === "load") {
      return respond(document, corsHeaders);
    }

    const action = mapAction(payload, sessionTeacherId);
    if (!action) {
      return new Response("Unknown classroom action", { status: 400, headers: corsHeaders });
    }

    const updated = applyClassroomAction(document, action);
    await writeDocument(sessionTeacherId, updated);
    return respond(updated, corsHeaders);
  } catch (error) {
    console.error("[Classroom] handler error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500, headers: corsHeaders });
  }
}

const readDocument = async (teacherId: string): Promise<ClassroomDocument> => {
  const raw = await kv.get<string>(keyForTeacher(teacherId));
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
  await kv.set(keyForTeacher(teacherId), JSON.stringify(document));
};

const mapAction = (
  request: ClassroomRequest,
  teacherId: string
): ClassroomAction | null => {
  switch (request.action) {
    case "createClass":
      return { type: "createClass", teacherId, payload: request.payload };
    case "addStudent":
      return { type: "addStudent", teacherId, payload: request.payload };
    case "createAssignment":
      return { type: "createAssignment", teacherId, payload: request.payload };
    case "recordProgress":
      return { type: "recordProgress", teacherId, payload: request.payload };
    case "refreshAnalytics":
      return { type: "refreshAnalytics", teacherId, payload: request.payload };
    default:
      return null;
  }
};

const respond = (document: ClassroomDocument, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(document), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
