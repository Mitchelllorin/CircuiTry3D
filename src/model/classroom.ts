import type { PracticeDifficulty } from "./practice";

export type ClassStudentStatus = "invited" | "active" | "inactive";

export type ClassAssignmentStatus = "draft" | "scheduled" | "open" | "closed";

export type StudentAssignmentProgress = {
  assignmentId: string;
  status: "not_started" | "in_progress" | "completed";
  score: number;
  timeSpentMinutes: number;
  attempts: number;
  hintsUsed: number;
  startedAt?: number;
  completedAt?: number;
  lastActivityAt?: number;
};

export type ClassStudent = {
  id: string;
  name: string;
  email: string;
  status: ClassStudentStatus;
  invitedAt: number;
  lastActiveAt?: number;
  userId?: string;
  progress?: StudentAssignmentProgress[];
  totalXp?: number;
  currentStreak?: number;
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
  sharedCircuits?: SharedCircuit[];
  liveSession?: LiveSession;
};

export type SharedCircuit = {
  id: string;
  title: string;
  circuitData: string;
  sharedAt: number;
  sharedBy: string;
  notes?: string;
};

export type LiveSession = {
  id: string;
  startedAt: number;
  endedAt?: number;
  activeAssignmentId?: string;
  participantIds: string[];
  status: "active" | "paused" | "ended";
};

export type ClassroomDocument = {
  teacherId: string;
  updatedAt: number;
  classes: Classroom[];
};

