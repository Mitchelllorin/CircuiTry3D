import type { PracticeDifficulty } from "./practice";

export type ClassStudentStatus = "invited" | "active" | "inactive";

export type ClassAssignmentStatus = "draft" | "scheduled" | "open" | "closed";

export type ClassStudent = {
  id: string;
  name: string;
  email: string;
  status: ClassStudentStatus;
  invitedAt: number;
  lastActiveAt?: number;
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
  problemId: string;
  problemTitle: string;
  problemTags: string[];
  difficulty: PracticeDifficulty;
  dueDate: string;
  assignedAt: number;
  status: ClassAssignmentStatus;
  notes?: string;
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
  analytics: ClassAnalytics;
};

export type ClassroomDocument = {
  teacherId: string;
  updatedAt: number;
  classes: Classroom[];
};

