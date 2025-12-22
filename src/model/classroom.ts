import type { PracticeDifficulty } from "./practice";

export type ClassStudentStatus = "invited" | "active" | "inactive";

export type ClassAssignmentStatus = "draft" | "scheduled" | "open" | "closed";

export type ClassAssignmentSubmissionStatus = "started" | "submitted" | "returned";

export type ClassStudent = {
  id: string;
  name: string;
  email: string;
  status: ClassStudentStatus;
  invitedAt: number;
  lastActiveAt?: number;
};

export type ClassAssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  submittedAt: number;
  status: ClassAssignmentSubmissionStatus;
  score?: number;
  completionRate?: number;
  timeMinutes?: number;
  notes?: string;
  artifact?: {
    kind: "practice";
    problemId: string;
    worksheetComplete?: boolean;
  };
};

export type AssignmentPerformance = {
  completionRate: number;
  averageScore: number;
  strugglingConcepts: { tag: string; count: number }[];
  averageTimeMinutes: number;
  hintsUsed: number;
};

export type ClassAssignment = {
  id: string;
  title: string;
  assignmentType?: "practice" | "circuit";
  problemId: string;
  problemTitle: string;
  problemTags: string[];
  difficulty: PracticeDifficulty;
  dueDate: string;
  assignedAt: number;
  status: ClassAssignmentStatus;
  notes?: string;
  circuitTemplate?: {
    format: "legacy-json-v2";
    filename?: string;
    state: unknown;
  };
  performance: AssignmentPerformance;
};

export type ClassAnalytics = {
  totalStudents: number;
  activeStudents: number;
  completionRate: number;
  averageTimeMinutes: number;
  streakHealth: number;
  strugglingConcepts: { tag: string; count: number }[];
  recentActivity: { label: string; value: number }[];
};

export type Classroom = {
  id: string;
  name: string;
  subject: string;
  gradeLevel?: string;
  description?: string;
  joinCode: string;
  teacherId: string;
  createdAt: number;
  students: ClassStudent[];
  assignments: ClassAssignment[];
  submissions: ClassAssignmentSubmission[];
  analytics: ClassAnalytics;
};

export type ClassroomDocument = {
  teacherId: string;
  updatedAt: number;
  classes: Classroom[];
};

