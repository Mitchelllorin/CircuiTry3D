import type { ClassroomDocument } from "../model/classroom";
import {
  applyClassroomAction,
  ensureDocument,
  type AddStudentPayload,
  type ClassroomAction,
  type CreateAssignmentPayload,
  type CreateClassroomPayload,
  type RecordProgressPayload,
} from "./classroomMutations";

const FUNCTION_ENDPOINT = "/api/classroom";
const LOCAL_STORAGE_KEY = "circuiTry3d.classrooms.fallback.v2";

type ClassroomRequest =
  | { action: "load"; teacherId: string }
  | { action: "createClass"; teacherId: string; payload: CreateClassroomPayload }
  | { action: "addStudent"; teacherId: string; payload: AddStudentPayload }
  | { action: "createAssignment"; teacherId: string; payload: CreateAssignmentPayload }
  | { action: "recordProgress"; teacherId: string; payload: RecordProgressPayload }
  | { action: "refreshAnalytics"; teacherId: string; payload: { classId: string } };

export const classroomApi = {
  async load(teacherId: string): Promise<ClassroomDocument> {
    return requestWithFallback({ action: "load", teacherId }, teacherId);
  },

  async createClassroom(teacherId: string, payload: CreateClassroomPayload): Promise<ClassroomDocument> {
    return mutateWithFallback({ action: "createClass", teacherId, payload }, teacherId, {
      type: "createClass",
      teacherId,
      payload,
    });
  },

  async addStudent(teacherId: string, payload: AddStudentPayload): Promise<ClassroomDocument> {
    return mutateWithFallback({ action: "addStudent", teacherId, payload }, teacherId, {
      type: "addStudent",
      teacherId,
      payload,
    });
  },

  async createAssignment(teacherId: string, payload: CreateAssignmentPayload): Promise<ClassroomDocument> {
    return mutateWithFallback({ action: "createAssignment", teacherId, payload }, teacherId, {
      type: "createAssignment",
      teacherId,
      payload,
    });
  },

  async recordProgress(teacherId: string, payload: RecordProgressPayload): Promise<ClassroomDocument> {
    return mutateWithFallback({ action: "recordProgress", teacherId, payload }, teacherId, {
      type: "recordProgress",
      teacherId,
      payload,
    });
  },

  async refreshAnalytics(teacherId: string, classId: string): Promise<ClassroomDocument> {
    return mutateWithFallback(
      { action: "refreshAnalytics", teacherId, payload: { classId } },
      teacherId,
      { type: "refreshAnalytics", teacherId, payload: { classId } },
    );
  },
};

async function requestWithFallback(request: ClassroomRequest, teacherId: string): Promise<ClassroomDocument> {
  try {
    return await callFunction(request);
  } catch (error) {
    console.warn("[ClassroomAPI] Falling back to local document", error);
    const localDoc = readLocalDocument(teacherId);
    persistLocalDocument(teacherId, localDoc);
    return localDoc;
  }
}

async function mutateWithFallback(
  request: ClassroomRequest,
  teacherId: string,
  action: ClassroomAction,
): Promise<ClassroomDocument> {
  try {
    return await callFunction(request);
  } catch (error) {
    console.warn("[ClassroomAPI] Mutation fallback", error);
    const localDoc = readLocalDocument(teacherId);
    const updated = applyClassroomAction(localDoc, action);
    persistLocalDocument(teacherId, updated);
    return updated;
  }
}

async function callFunction(request: ClassroomRequest): Promise<ClassroomDocument> {
  const response = await fetch(FUNCTION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Classroom function error");
  }

  const payload = (await response.json()) as ClassroomDocument;
  return payload;
}

const localKey = (teacherId: string) => `${LOCAL_STORAGE_KEY}.${teacherId}`;

const readLocalDocument = (teacherId: string): ClassroomDocument => {
  if (typeof window === "undefined") {
    return ensureDocument(null, teacherId);
  }

  try {
    const raw = window.localStorage.getItem(localKey(teacherId));
    const parsed = raw ? (JSON.parse(raw) as ClassroomDocument) : null;
    return ensureDocument(parsed, teacherId);
  } catch (error) {
    console.warn("[ClassroomAPI] Failed to read local document", error);
    return ensureDocument(null, teacherId);
  }
};

const persistLocalDocument = (teacherId: string, document: ClassroomDocument) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(localKey(teacherId), JSON.stringify(document));
  } catch (error) {
    console.warn("[ClassroomAPI] Failed to persist local document", error);
  }
};

