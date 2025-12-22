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
  type SubmitAssignmentPayload,
} from "../../src/services/classroomMutations";

const store = getStore({ name: "classroom-data" });
const joinIndexStore = getStore({ name: "classroom-join-index" });

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
    if (!payload) {
      return { statusCode: 400, headers: corsHeaders, body: "Missing request body" };
    }

    if (payload.action === "studentJoin") {
      const joinCode = typeof payload.joinCode === "string" ? payload.joinCode.trim().toUpperCase() : "";
      const student = payload.student && typeof payload.student === "object" ? payload.student : null;
      const studentId = typeof student?.id === "string" ? student.id.trim() : "";
      const studentName = typeof student?.name === "string" ? student.name.trim() : "";
      const studentEmail = typeof student?.email === "string" ? student.email.trim() : "";
      if (!joinCode || !studentId || !studentName || !studentEmail) {
        return { statusCode: 400, headers: corsHeaders, body: "Missing joinCode or student identity" };
      }

      const mapping = await readJoinMapping(joinCode);
      if (!mapping) {
        return { statusCode: 404, headers: corsHeaders, body: "Join code not found" };
      }

      const document = await readDocument(mapping.teacherId);
      const classroom = document.classes.find((c) => c.id === mapping.classId);
      if (!classroom) {
        return { statusCode: 404, headers: corsHeaders, body: "Classroom not found" };
      }

      const updated = applyClassroomAction(document, {
        type: "addStudent",
        teacherId: mapping.teacherId,
        payload: {
          classId: classroom.id,
          studentId,
          name: studentName,
          email: studentEmail,
          status: "active",
        },
      });

      await writeDocument(mapping.teacherId, updated);
      const updatedClass = updated.classes.find((c) => c.id === mapping.classId) ?? classroom;

      return respond({
        teacherId: mapping.teacherId,
        classId: mapping.classId,
        classSnapshot: updatedClass,
        updatedAt: updated.updatedAt,
      });
    }

    if (payload.action === "studentSubmit") {
      const joinCode = typeof payload.joinCode === "string" ? payload.joinCode.trim().toUpperCase() : "";
      const submissionPayload = payload.payload && typeof payload.payload === "object" ? payload.payload : null;
      if (!joinCode || !submissionPayload) {
        return { statusCode: 400, headers: corsHeaders, body: "Missing joinCode or submission payload" };
      }

      const mapping = await readJoinMapping(joinCode);
      if (!mapping) {
        return { statusCode: 404, headers: corsHeaders, body: "Join code not found" };
      }

      const classId =
        typeof submissionPayload.classId === "string" && submissionPayload.classId.trim()
          ? submissionPayload.classId.trim()
          : mapping.classId;

      const document = await readDocument(mapping.teacherId);
      const classroom = document.classes.find((c) => c.id === classId);
      if (!classroom) {
        return { statusCode: 404, headers: corsHeaders, body: "Classroom not found" };
      }

      const assignmentId = typeof submissionPayload.assignmentId === "string" ? submissionPayload.assignmentId.trim() : "";
      const studentId = typeof submissionPayload.studentId === "string" ? submissionPayload.studentId.trim() : "";
      if (!assignmentId || !studentId) {
        return { statusCode: 400, headers: corsHeaders, body: "Missing assignmentId or studentId" };
      }

      const submitAction: ClassroomAction = {
        type: "submitAssignment",
        teacherId: mapping.teacherId,
        payload: {
          classId,
          assignmentId,
          studentId,
          studentName: typeof submissionPayload.studentName === "string" ? submissionPayload.studentName : undefined,
          status: typeof submissionPayload.status === "string" ? (submissionPayload.status as SubmitAssignmentPayload["status"]) : undefined,
          score: typeof submissionPayload.score === "number" ? submissionPayload.score : undefined,
          completionRate: typeof submissionPayload.completionRate === "number" ? submissionPayload.completionRate : undefined,
          timeMinutes: typeof submissionPayload.timeMinutes === "number" ? submissionPayload.timeMinutes : undefined,
          notes: typeof submissionPayload.notes === "string" ? submissionPayload.notes : undefined,
          worksheetComplete: typeof submissionPayload.worksheetComplete === "boolean" ? submissionPayload.worksheetComplete : undefined,
        },
      };

      const updated = applyClassroomAction(document, submitAction);
      await writeDocument(mapping.teacherId, updated);
      const updatedClass = updated.classes.find((c) => c.id === classId) ?? classroom;

      return respond({
        teacherId: mapping.teacherId,
        classId,
        classSnapshot: updatedClass,
        updatedAt: updated.updatedAt,
      });
    }

    if (!("teacherId" in payload) || typeof payload.teacherId !== "string" || !payload.teacherId) {
      return { statusCode: 400, headers: corsHeaders, body: "Missing teacherId" };
    }

    const document = await readDocument(payload.teacherId);

    if (payload.action === "load") {
      await ensureJoinMappings(payload.teacherId, document);
      return respond(document);
    }

    const action = mapAction(payload);
    if (!action) {
      return { statusCode: 400, headers: corsHeaders, body: "Unknown classroom action" };
    }

    const updated = applyClassroomAction(document, action);
    await writeDocument(payload.teacherId, updated);

    if (action.type === "createClass") {
      const created = updated.classes[0];
      if (created?.joinCode && created?.id) {
        await writeJoinMapping(created.joinCode, { teacherId: payload.teacherId, classId: created.id });
      }
    }

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
  | { action: "submitAssignment"; teacherId: string; payload: SubmitAssignmentPayload }
  | { action: "refreshAnalytics"; teacherId: string; payload: { classId: string } }
  | {
      action: "studentJoin";
      joinCode: string;
      student: { id: string; name: string; email: string };
    }
  | { action: "studentSubmit"; joinCode: string; payload: Partial<SubmitAssignmentPayload> & { assignmentId: string; studentId: string } };

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

type JoinMapping = { teacherId: string; classId: string };

const readJoinMapping = async (joinCode: string): Promise<JoinMapping | null> => {
  try {
    const stored = await joinIndexStore.get(joinCode, { type: "json" });
    const mapping = stored as Partial<JoinMapping> | null;
    if (!mapping || typeof mapping.teacherId !== "string" || typeof mapping.classId !== "string") {
      return null;
    }
    return { teacherId: mapping.teacherId, classId: mapping.classId };
  } catch (error) {
    console.warn("[Classroom] readJoinMapping failed", error);
    return null;
  }
};

const writeJoinMapping = async (joinCode: string, mapping: JoinMapping) => {
  await joinIndexStore.set(joinCode, JSON.stringify(mapping));
};

const ensureJoinMappings = async (teacherId: string, document: ClassroomDocument) => {
  await Promise.all(
    document.classes.map(async (classroom) => {
      if (!classroom.joinCode || !classroom.id) {
        return;
      }
      try {
        await writeJoinMapping(classroom.joinCode, { teacherId, classId: classroom.id });
      } catch (error) {
        console.warn("[Classroom] ensureJoinMappings failed", error);
      }
    }),
  );
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
    case "submitAssignment":
      return { type: "submitAssignment", teacherId: request.teacherId, payload: request.payload };
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

