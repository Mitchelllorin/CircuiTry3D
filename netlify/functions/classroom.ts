import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import type { ClassroomDocument } from "../../src/model/classroom";
import {
  applyClassroomAction,
  ensureDocument,
  type ClassroomAction,
  type CreateAssignmentPayload,
  type CreateClassroomPayload,
  type AddStudentPayload,
  type RecordProgressPayload,
} from "../../src/services/classroomMutations";

const store = getStore({ name: "classroom-data" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "ok" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: "Method not allowed",
    };
  }

  try {
    const payload = event.body ? (JSON.parse(event.body) as ClassroomRequest) : null;
    if (!payload || !payload.teacherId) {
      return { statusCode: 400, headers: corsHeaders, body: "Missing teacherId" };
    }

    const document = await readDocument(payload.teacherId);

    if (payload.action === "load") {
      return respond(document);
    }

    const action = mapAction(payload);
    if (!action) {
      return { statusCode: 400, headers: corsHeaders, body: "Unknown classroom action" };
    }

    const updated = applyClassroomAction(document, action);
    await writeDocument(payload.teacherId, updated);
    return respond(updated);
  } catch (error) {
    console.error("[Classroom] handler error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { statusCode: 500, headers: corsHeaders, body: message };
  }
};

type ClassroomRequest =
  | { action: "load"; teacherId: string }
  | { action: "createClass"; teacherId: string; payload: CreateClassroomPayload }
  | { action: "addStudent"; teacherId: string; payload: AddStudentPayload }
  | { action: "createAssignment"; teacherId: string; payload: CreateAssignmentPayload }
  | { action: "recordProgress"; teacherId: string; payload: RecordProgressPayload }
  | { action: "refreshAnalytics"; teacherId: string; payload: { classId: string } };

const readDocument = async (teacherId: string): Promise<ClassroomDocument> => {
  try {
    const stored = await store.get(teacherId, { type: "json" });
    return ensureDocument(stored as ClassroomDocument | null, teacherId);
  } catch (error) {
    console.warn("[Classroom] readDocument fallback", error);
    return ensureDocument(null, teacherId);
  }
};

const writeDocument = async (teacherId: string, document: ClassroomDocument) => {
  await store.set(teacherId, JSON.stringify(document));
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

const respond = (document: ClassroomDocument) => ({
  statusCode: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
  body: JSON.stringify(document),
});

