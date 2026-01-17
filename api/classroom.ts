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

export const config = {
  runtime: "edge",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const keyForTeacher = (teacherId: string) => `classroom:${teacherId}`;

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
