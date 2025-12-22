import type { ClassroomDocument } from "../model/classroom";
import {
  applyClassroomAction,
  ensureDocument,
  type AddStudentPayload,
  type ClassroomAction,
  type CreateAssignmentPayload,
  type CreateClassroomPayload,
  type RecordProgressPayload,
  type SubmitAssignmentPayload,
} from "./classroomMutations";

const FUNCTION_ENDPOINT = "/.netlify/functions/classroom";
const LOCAL_STORAGE_KEY = "circuiTry3d.classrooms.fallback.v2";

type ClassroomRequest =
  | { action: "load"; teacherId: string }
  | { action: "createClass"; teacherId: string; payload: CreateClassroomPayload }
  | { action: "addStudent"; teacherId: string; payload: AddStudentPayload }
  | { action: "createAssignment"; teacherId: string; payload: CreateAssignmentPayload }
  | { action: "recordProgress"; teacherId: string; payload: RecordProgressPayload }
  | { action: "submitAssignment"; teacherId: string; payload: SubmitAssignmentPayload }
  | { action: "refreshAnalytics"; teacherId: string; payload: { classId: string } };

export type StudentJoinRequest = {
  joinCode: string;
  student: { id: string; name: string; email: string };
};

export type StudentJoinResponse = {
  teacherId: string;
  classId: string;
  classSnapshot: import("../model/classroom").Classroom;
  updatedAt: number;
};

export type StudentSubmitRequest = {
  joinCode: string;
  payload: Omit<SubmitAssignmentPayload, "classId"> & { classId?: string };
};

export type StudentSubmitResponse = {
  teacherId: string;
  classId: string;
  classSnapshot: import("../model/classroom").Classroom;
  updatedAt: number;
};

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

  async submitAssignment(teacherId: string, payload: SubmitAssignmentPayload): Promise<ClassroomDocument> {
    return mutateWithFallback({ action: "submitAssignment", teacherId, payload }, teacherId, {
      type: "submitAssignment",
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

  async studentJoin(request: StudentJoinRequest): Promise<StudentJoinResponse> {
    const response = await fetch(FUNCTION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "studentJoin", ...request }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Unable to join classroom");
    }

    return (await response.json()) as StudentJoinResponse;
  },

  async studentSubmit(request: StudentSubmitRequest): Promise<StudentSubmitResponse> {
    const response = await fetch(FUNCTION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "studentSubmit", ...request }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Unable to submit assignment");
    }

    return (await response.json()) as StudentSubmitResponse;
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

