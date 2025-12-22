import practiceProblems, { getRandomPracticeProblem } from "../data/practiceProblems";
import type { PracticeProblem } from "../model/practice";
import type {
  AssignmentPerformance,
  ClassAssignment,
  ClassAnalytics,
  ClassStudent,
  ClassAssignmentSubmission,
  Classroom,
  ClassroomDocument,
} from "../model/classroom";

const SAMPLE_STUDENTS: ClassStudent[] = [
  { id: "stu-ava", name: "Ava Patel", email: "ava.patel@classroom.dev", status: "active", invitedAt: Date.now() - 1000 * 60 * 60 * 72, lastActiveAt: Date.now() - 1000 * 60 * 60 * 2 },
  { id: "stu-jalen", name: "Jalen Ortiz", email: "jalen.ortiz@classroom.dev", status: "active", invitedAt: Date.now() - 1000 * 60 * 60 * 48, lastActiveAt: Date.now() - 1000 * 60 * 60 * 6 },
  { id: "stu-kenji", name: "Kenji Lin", email: "kenji.lin@classroom.dev", status: "invited", invitedAt: Date.now() - 1000 * 60 * 60 * 12 },
];

const COMPLETION_BASELINE: Record<PracticeProblem["difficulty"], number> = {
  intro: 0.82,
  standard: 0.68,
  challenge: 0.54,
};

const SCORE_BASELINE: Record<PracticeProblem["difficulty"], number> = {
  intro: 0.9,
  standard: 0.78,
  challenge: 0.62,
};

const TIME_BASELINE: Record<PracticeProblem["difficulty"], number> = {
  intro: 11,
  standard: 18,
  challenge: 26,
};

export const generateJoinCode = (seed?: string): string => {
  const source = seed ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return source
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase()
    .padEnd(6, "X");
};

export const estimatePerformanceForProblem = (problem: PracticeProblem): AssignmentPerformance => {
  const completionRate = clampTo01(COMPLETION_BASELINE[problem.difficulty] + randomDelta(0.08));
  const averageScore = clampTo01(SCORE_BASELINE[problem.difficulty] + randomDelta(0.07));
  const averageTimeMinutes = Math.max(5, TIME_BASELINE[problem.difficulty] + randomDelta(6) * 10);
  const hintsUsed = Math.max(1, Math.round((1 - averageScore) * 8));
  const strugglingConcepts = (problem.conceptTags ?? []).slice(0, 3).map((tag) => ({
    tag,
    count: Math.max(1, Math.round((1 - averageScore) * 12)),
  }));

  return {
    completionRate,
    averageScore,
    averageTimeMinutes,
    hintsUsed,
    strugglingConcepts,
  };
};

export const computeAnalytics = (classroom: Classroom): ClassAnalytics => {
  const totalStudents = classroom.students.length;
  const activeStudents = classroom.students.filter((student) => student.status === "active").length;
  const totalExpectedSubmissions = classroom.assignments.length * Math.max(1, classroom.students.length);
  const uniqueSubmissions = new Set(
    classroom.submissions.map((submission) => `${submission.assignmentId}:${submission.studentId}`),
  ).size;
  const completionRate =
    totalExpectedSubmissions === 0
      ? 0
      : uniqueSubmissions > 0
        ? uniqueSubmissions / totalExpectedSubmissions
        : classroom.assignments.length === 0
          ? 0
          : classroom.assignments.reduce((sum, assignment) => sum + assignment.performance.completionRate, 0) /
            classroom.assignments.length;
  const averageTimeMinutes =
    classroom.assignments.length === 0
      ? 0
      : classroom.assignments.reduce((sum, assignment) => sum + assignment.performance.averageTimeMinutes, 0) /
        classroom.assignments.length;

  const strugglingMap = new Map<string, number>();
  classroom.assignments.forEach((assignment) => {
    assignment.performance.strugglingConcepts.forEach(({ tag, count }) => {
      strugglingMap.set(tag, (strugglingMap.get(tag) ?? 0) + count);
    });
  });

  const strugglingConcepts = Array.from(strugglingMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentActivity = classroom.assignments.slice(0, 3).map((assignment) => ({
    label: assignment.title,
    value: Math.round(assignment.performance.completionRate * 100),
  }));

  return {
    totalStudents,
    activeStudents,
    completionRate,
    averageTimeMinutes,
    streakHealth: Math.round(completionRate * 100),
    strugglingConcepts,
    recentActivity,
  };
};

export const createAssignmentFromProblem = (
  problem: PracticeProblem,
  options: { dueDate?: string; status?: ClassAssignment["status"]; notes?: string } = {},
): ClassAssignment => {
  const performance = estimatePerformanceForProblem(problem);
  const assignedAt = Date.now();
  const dueDate =
    options.dueDate ??
    new Date(assignedAt + 1000 * 60 * 60 * 24 * (problem.difficulty === "challenge" ? 5 : 3)).toISOString();

  return {
    id: `assign-${assignedAt}-${Math.random().toString(36).slice(2, 8)}`,
    title: problem.title,
    problemId: problem.id,
    problemTitle: problem.title,
    problemTags: problem.conceptTags,
    difficulty: problem.difficulty,
    dueDate,
    assignedAt,
    status: options.status ?? "open",
    notes: options.notes,
    performance,
  };
};

export const generateClassroomDocument = (teacherId: string): ClassroomDocument => {
  const problemA = practiceProblems.find((problem) => problem.difficulty === "intro") ?? getRandomPracticeProblem();
  const problemB = practiceProblems.find((problem) => problem.difficulty === "standard") ?? getRandomPracticeProblem();
  const problemC = practiceProblems.find((problem) => problem.difficulty === "challenge") ?? getRandomPracticeProblem();

  const classA = createClassroom({
    teacherId,
    name: "Circuit Fundamentals",
    subject: "Physics / CTE",
    gradeLevel: "9-10",
    description: "Daily warmups focused on W.I.R.E. fluency and Ohm's Law intuition.",
    baseStudents: SAMPLE_STUDENTS,
    assignments: [problemA, problemB].filter(Boolean).map((problem) => createAssignmentFromProblem(problem!)),
  });

  const classB = createClassroom({
    teacherId,
    name: "Advanced Electronics Lab",
    subject: "Engineering",
    gradeLevel: "11-12",
    description: "Project teams building arena-ready prototypes with parallel diagnostics.",
    baseStudents: SAMPLE_STUDENTS.map((student, index) => ({
      ...student,
      id: `${student.id}-lab-${index}`,
      status: index === 2 ? "invited" : "active",
    })),
    assignments: [problemC, problemB].filter(Boolean).map((problem) => createAssignmentFromProblem(problem!)),
  });

  return {
    teacherId,
    updatedAt: Date.now(),
    classes: [classA, classB],
  };
};

type ClassroomSeedOptions = {
  teacherId: string;
  name: string;
  subject: string;
  gradeLevel?: string;
  description?: string;
  baseStudents: ClassStudent[];
  assignments: ClassAssignment[];
};

const createClassroom = (options: ClassroomSeedOptions): Classroom => {
  const { teacherId, name, subject, gradeLevel, description, baseStudents, assignments } = options;
  const classroom: Classroom = {
    id: `class-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    subject,
    gradeLevel,
    description,
    joinCode: generateJoinCode(name),
    teacherId,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    students: baseStudents,
    assignments,
    submissions: [] satisfies ClassAssignmentSubmission[],
    analytics: {
      totalStudents: baseStudents.length,
      activeStudents: baseStudents.filter((student) => student.status === "active").length,
      completionRate: 0,
      averageTimeMinutes: 0,
      streakHealth: 0,
      strugglingConcepts: [],
      recentActivity: [],
    },
  };

  classroom.analytics = computeAnalytics(classroom);
  return classroom;
};

const randomDelta = (magnitude: number) => (Math.random() - 0.5) * magnitude;

const clampTo01 = (value: number) => Math.min(1, Math.max(0, value));

