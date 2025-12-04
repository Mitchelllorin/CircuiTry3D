import { findPracticeProblemById, getRandomPracticeProblem } from "../data/practiceProblems";
import type {
  AssignmentPerformance,
  ClassAnalytics,
  ClassAssignment,
  ClassStudent,
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

export type ClassroomAction =
  | { type: "createClass"; teacherId: string; payload: CreateClassroomPayload }
  | { type: "addStudent"; teacherId: string; payload: AddStudentPayload }
  | { type: "createAssignment"; teacherId: string; payload: CreateAssignmentPayload }
  | { type: "recordProgress"; teacherId: string; payload: RecordProgressPayload }
  | { type: "refreshAnalytics"; teacherId: string; payload: RefreshAnalyticsPayload };

export const ensureDocument = (doc: ClassroomDocument | null | undefined, teacherId: string): ClassroomDocument =>
  doc && doc.classes ? doc : generateClassroomDocument(teacherId);

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
    id: `stu-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: email.trim(),
    status: "invited",
    invitedAt: now,
  };

  target.students = [student, ...target.students];
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

