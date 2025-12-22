import { findPracticeProblemById, getRandomPracticeProblem } from "../data/practiceProblems";
import type {
  AssignmentPerformance,
  ClassAnalytics,
  ClassAssignment,
  ClassStudent,
  ClassAssignmentSubmission,
  Classroom,
  ClassroomDocument,
} from "../model/classroom";
import { computeAnalytics, createAssignmentFromProblem, generateClassroomDocument, generateJoinCode } from "./classroomSeed";

export type CreateClassroomPayload = {
  name: string;
  subject: string;
  gradeLevel?: string;
  description?: string;
};

export type AddStudentPayload = {
  classId: string;
  name: string;
  email: string;
  studentId?: string;
  status?: ClassStudent["status"];
};

export type CreateAssignmentPayload = {
  classId: string;
  problemId: string;
  dueDate?: string;
  notes?: string;
};

export type RecordProgressPayload = {
  classId: string;
  assignmentId: string;
  completionRate: number;
  averageScore: number;
  strugglingConcepts: string[];
  averageTimeMinutes?: number;
  hintsUsed?: number;
};

export type RefreshAnalyticsPayload = {
  classId: string;
};

export type SubmitAssignmentPayload = {
  classId: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  status?: ClassAssignmentSubmission["status"];
  score?: number;
  completionRate?: number;
  timeMinutes?: number;
  notes?: string;
  worksheetComplete?: boolean;
};

export type ClassroomAction =
  | { type: "createClass"; teacherId: string; payload: CreateClassroomPayload }
  | { type: "addStudent"; teacherId: string; payload: AddStudentPayload }
  | { type: "createAssignment"; teacherId: string; payload: CreateAssignmentPayload }
  | { type: "recordProgress"; teacherId: string; payload: RecordProgressPayload }
  | { type: "submitAssignment"; teacherId: string; payload: SubmitAssignmentPayload }
  | { type: "refreshAnalytics"; teacherId: string; payload: RefreshAnalyticsPayload };

export const ensureDocument = (doc: ClassroomDocument | null | undefined, teacherId: string): ClassroomDocument => {
  const base = doc && doc.classes ? doc : generateClassroomDocument(teacherId);
  return {
    ...base,
    classes: base.classes.map((classroom) => ({
      ...classroom,
      submissions: Array.isArray((classroom as Partial<Classroom>).submissions) ? (classroom as Classroom).submissions : [],
    })),
  };
};

export const applyClassroomAction = (
  document: ClassroomDocument,
  action: ClassroomAction,
): ClassroomDocument => {
  switch (action.type) {
    case "createClass":
      return applyCreateClass(document, action.teacherId, action.payload);
    case "addStudent":
      return applyAddStudent(document, action.payload);
    case "createAssignment":
      return applyCreateAssignment(document, action.payload);
    case "recordProgress":
      return applyRecordProgress(document, action.payload);
    case "submitAssignment":
      return applySubmitAssignment(document, action.payload);
    case "refreshAnalytics":
      return applyRefreshAnalytics(document, action.payload);
    default:
      return document;
  }
};

const applyCreateClass = (
  doc: ClassroomDocument,
  teacherId: string,
  payload: CreateClassroomPayload,
): ClassroomDocument => {
  const now = Date.now();
  const classroom: Classroom = {
    id: `class-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name: payload.name.trim(),
    subject: payload.subject.trim(),
    gradeLevel: payload.gradeLevel?.trim(),
    description: payload.description?.trim(),
    joinCode: generateJoinCode(payload.name),
    teacherId,
    createdAt: now,
    students: [],
    assignments: [],
    submissions: [],
    analytics: emptyAnalytics(),
  };

  const classes = [classroom, ...doc.classes];
  return { ...doc, updatedAt: now, classes };
};

const applyAddStudent = (doc: ClassroomDocument, payload: AddStudentPayload): ClassroomDocument => {
  const { classId, name, email } = payload;
  const target = doc.classes.find((classroom) => classroom.id === classId);
  if (!target) {
    return doc;
  }

  const now = Date.now();
  const student: ClassStudent = {
    id: payload.studentId?.trim() || `stu-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: email.trim(),
    status: payload.status ?? "invited",
    invitedAt: now,
    lastActiveAt: payload.status === "active" ? now : undefined,
  };

  const existing = target.students.find((entry) => entry.id === student.id || entry.email.toLowerCase() === student.email.toLowerCase());
  if (existing) {
    existing.name = student.name;
    existing.email = student.email;
    existing.status = payload.status ?? existing.status;
    existing.lastActiveAt = payload.status === "active" ? now : existing.lastActiveAt;
  } else {
    target.students = [student, ...target.students];
  }
  target.analytics = computeAnalytics(target);

  return { ...doc, updatedAt: now, classes: replaceClass(doc.classes, target) };
};

const applyCreateAssignment = (doc: ClassroomDocument, payload: CreateAssignmentPayload): ClassroomDocument => {
  const target = doc.classes.find((classroom) => classroom.id === payload.classId);
  if (!target) {
    return doc;
  }

  const problem = findPracticeProblemById(payload.problemId) ?? getRandomPracticeProblem();
  if (!problem) {
    return doc;
  }

  const assignment = createAssignmentFromProblem(problem, {
    dueDate: payload.dueDate,
    notes: payload.notes,
  });

  target.assignments = [assignment, ...target.assignments];
  target.analytics = computeAnalytics(target);

  return { ...doc, updatedAt: Date.now(), classes: replaceClass(doc.classes, target) };
};

const applySubmitAssignment = (doc: ClassroomDocument, payload: SubmitAssignmentPayload): ClassroomDocument => {
  const target = doc.classes.find((classroom) => classroom.id === payload.classId);
  if (!target) {
    return doc;
  }

  const assignment = target.assignments.find((entry) => entry.id === payload.assignmentId);
  if (!assignment) {
    return doc;
  }

  const now = Date.now();
  const submissionId = `sub-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const desiredStatus: ClassAssignmentSubmission["status"] = payload.status ?? "submitted";

  const existing = target.submissions.find(
    (entry) => entry.assignmentId === payload.assignmentId && entry.studentId === payload.studentId,
  );

  const next: ClassAssignmentSubmission = {
    id: existing?.id ?? submissionId,
    assignmentId: payload.assignmentId,
    studentId: payload.studentId,
    studentName: payload.studentName?.trim() || existing?.studentName,
    submittedAt: now,
    status: desiredStatus,
    score: typeof payload.score === "number" ? clampTo01(payload.score) : existing?.score,
    completionRate: typeof payload.completionRate === "number" ? clampTo01(payload.completionRate) : existing?.completionRate,
    timeMinutes: typeof payload.timeMinutes === "number" ? Math.max(0, payload.timeMinutes) : existing?.timeMinutes,
    notes: payload.notes?.trim() || existing?.notes,
    artifact: {
      kind: "practice",
      problemId: assignment.problemId,
      worksheetComplete: typeof payload.worksheetComplete === "boolean" ? payload.worksheetComplete : existing?.artifact?.worksheetComplete,
    },
  };

  target.submissions = [
    next,
    ...target.submissions.filter((entry) => !(entry.assignmentId === payload.assignmentId && entry.studentId === payload.studentId)),
  ];
  target.analytics = computeAnalytics(target);

  return { ...doc, updatedAt: now, classes: replaceClass(doc.classes, target) };
};

const applyRecordProgress = (doc: ClassroomDocument, payload: RecordProgressPayload): ClassroomDocument => {
  const target = doc.classes.find((classroom) => classroom.id === payload.classId);
  if (!target) {
    return doc;
  }

  const assignment = target.assignments.find((entry) => entry.id === payload.assignmentId);
  if (!assignment) {
    return doc;
  }

  const performance: AssignmentPerformance = {
    completionRate: clampTo01(payload.completionRate),
    averageScore: clampTo01(payload.averageScore),
    averageTimeMinutes: payload.averageTimeMinutes ?? assignment.performance.averageTimeMinutes,
    hintsUsed: payload.hintsUsed ?? assignment.performance.hintsUsed,
    strugglingConcepts: payload.strugglingConcepts.map((tag) => ({
      tag,
      count: Math.max(1, Math.round((1 - payload.averageScore) * 12)),
    })),
  };

  assignment.performance = performance;
  target.analytics = computeAnalytics(target);

  return { ...doc, updatedAt: Date.now(), classes: replaceClass(doc.classes, target) };
};

const applyRefreshAnalytics = (doc: ClassroomDocument, payload: RefreshAnalyticsPayload): ClassroomDocument => {
  const target = doc.classes.find((classroom) => classroom.id === payload.classId);
  if (!target) {
    return doc;
  }

  target.analytics = computeAnalytics(target);
  return { ...doc, updatedAt: Date.now(), classes: replaceClass(doc.classes, target) };
};

const replaceClass = (classes: Classroom[], updated: Classroom): Classroom[] =>
  classes.map((existing) => (existing.id === updated.id ? { ...updated } : existing));

const emptyAnalytics = (): ClassAnalytics => ({
  totalStudents: 0,
  activeStudents: 0,
  completionRate: 0,
  averageTimeMinutes: 0,
  streakHealth: 0,
  strugglingConcepts: [],
  recentActivity: [],
});

const clampTo01 = (value: number) => Math.min(1, Math.max(0, value));

