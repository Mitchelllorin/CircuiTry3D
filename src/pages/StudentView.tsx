import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import type { ClassAssignment, Classroom, StudentAssignmentProgress } from "../model/classroom";
import { useAuth } from "../context/AuthContext";
import WordMark from "../components/WordMark";
import "../styles/student-view.css";

type StudentClassroom = {
  classroom: Classroom;
  studentId: string;
  assignments: ClassAssignment[];
  progress: StudentAssignmentProgress[];
};

const STORAGE_KEY = "circuiTry3d.student.classes.v1";

const loadStudentClasses = (userId: string): StudentClassroom[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}.${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStudentClasses = (userId: string, classes: StudentClassroom[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY}.${userId}`, JSON.stringify(classes));
  } catch (e) {
    console.warn("Failed to save student classes", e);
  }
};

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "intro":
      return "var(--color-success)";
    case "standard":
      return "var(--color-warning)";
    case "challenge":
      return "var(--color-error)";
    default:
      return "var(--text-secondary)";
  }
};

export default function StudentView() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? "student-demo";

  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<StudentClassroom[]>(() =>
    loadStudentClasses(userId)
  );
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    enrolledClasses[0]?.classroom.id ?? null
  );

  const selectedClass = useMemo(
    () => enrolledClasses.find((ec) => ec.classroom.id === selectedClassId) ?? null,
    [enrolledClasses, selectedClassId]
  );

  const studentStats = useMemo(() => {
    if (!selectedClass) return { completed: 0, inProgress: 0, total: 0, avgScore: 0 };
    const progress = selectedClass.progress || [];
    const completed = progress.filter((p) => p.status === "completed").length;
    const inProgress = progress.filter((p) => p.status === "in_progress").length;
    const total = selectedClass.assignments.length;
    const scores = progress.filter((p) => p.status === "completed").map((p) => p.score);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { completed, inProgress, total, avgScore };
  }, [selectedClass]);

  const handleJoinClass = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setJoinError(null);
      setJoinSuccess(null);

      const code = joinCode.trim().toUpperCase();
      if (!code) {
        setJoinError("Please enter a join code.");
        return;
      }

      if (enrolledClasses.some((ec) => ec.classroom.joinCode === code)) {
        setJoinError("You are already enrolled in this class.");
        return;
      }

      // Simulate joining - in production this would call the classroom API
      // For now, create a demo class structure
      const demoClassroom: Classroom = {
        id: `class-joined-${Date.now()}`,
        name: `Class ${code}`,
        subject: "Circuit Fundamentals",
        gradeLevel: "9-10",
        joinCode: code,
        teacherId: "teacher-demo",
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
        students: [],
        assignments: [
          {
            id: "demo-assignment-1",
            title: "Series Circuit Basics",
            problemId: "series-square-01",
            problemTitle: "Series Circuit · Circuit Current",
            problemTags: ["series", "ohms-law"],
            difficulty: "intro",
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
            assignedAt: Date.now() - 1000 * 60 * 60 * 24,
            status: "open",
            notes: "Complete the W.I.R.E. table for this series circuit.",
            performance: {
              completionRate: 0,
              averageScore: 0,
              strugglingConcepts: [],
              averageTimeMinutes: 0,
              hintsUsed: 0,
            },
          },
          {
            id: "demo-assignment-2",
            title: "Parallel Circuit Analysis",
            problemId: "parallel-total-current-02",
            problemTitle: "Parallel Circuit · Total Current",
            problemTags: ["parallel", "kcl"],
            difficulty: "standard",
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
            assignedAt: Date.now(),
            status: "open",
            notes: "Apply Kirchhoff's Current Law to find total current.",
            performance: {
              completionRate: 0,
              averageScore: 0,
              strugglingConcepts: [],
              averageTimeMinutes: 0,
              hintsUsed: 0,
            },
          },
        ],
        analytics: {
          totalStudents: 12,
          activeStudents: 8,
          completionRate: 0.65,
          averageTimeMinutes: 15,
          streakHealth: 72,
          strugglingConcepts: [],
          recentActivity: [],
        },
      };

      const newEnrolled: StudentClassroom = {
        classroom: demoClassroom,
        studentId: `stu-${userId}`,
        assignments: demoClassroom.assignments,
        progress: demoClassroom.assignments.map((a) => ({
          assignmentId: a.id,
          status: "not_started" as const,
          score: 0,
          timeSpentMinutes: 0,
          attempts: 0,
          hintsUsed: 0,
        })),
      };

      const updated = [...enrolledClasses, newEnrolled];
      setEnrolledClasses(updated);
      saveStudentClasses(userId, updated);
      setSelectedClassId(newEnrolled.classroom.id);
      setJoinCode("");
      setJoinSuccess(`Successfully joined ${demoClassroom.name}!`);
    },
    [joinCode, enrolledClasses, userId]
  );

  const getAssignmentProgress = (assignmentId: string): StudentAssignmentProgress | undefined => {
    return selectedClass?.progress?.find((p) => p.assignmentId === assignmentId);
  };

  const startAssignment = (assignmentId: string) => {
    if (!selectedClass) return;

    const updatedClasses = enrolledClasses.map((ec) => {
      if (ec.classroom.id !== selectedClass.classroom.id) return ec;

      const updatedProgress = ec.progress.map((p) => {
        if (p.assignmentId !== assignmentId) return p;
        if (p.status !== "not_started") return p;
        return {
          ...p,
          status: "in_progress" as const,
          startedAt: Date.now(),
          lastActivityAt: Date.now(),
        };
      });

      return { ...ec, progress: updatedProgress };
    });

    setEnrolledClasses(updatedClasses);
    saveStudentClasses(userId, updatedClasses);
  };

  return (
    <div className="student-view-page">
      <header className="student-view-header">
        <div>
          <WordMark size="sm" decorative className="student-view-brand" />
          <p className="eyebrow">Student Mode</p>
          <h1>Your Learning Dashboard</h1>
          <p>
            {currentUser
              ? `Welcome back, ${currentUser.displayName}! Track your assignments and progress.`
              : "Join a class and start learning circuits."}
          </p>
        </div>
        <div className="student-stats-row">
          <div>
            <strong>{studentStats.completed}</strong>
            <span>Completed</span>
          </div>
          <div>
            <strong>{studentStats.inProgress}</strong>
            <span>In Progress</span>
          </div>
          <div>
            <strong>{studentStats.total}</strong>
            <span>Total</span>
          </div>
          <div>
            <strong>{Math.round(studentStats.avgScore * 100)}%</strong>
            <span>Avg Score</span>
          </div>
        </div>
      </header>

      <div className="student-view-grid">
        <section className="student-view-panel">
          <div className="student-panel-header">
            <div>
              <h2>Your Classes</h2>
              <p>Classes you've joined</p>
            </div>
          </div>

          <div className="student-class-list">
            {enrolledClasses.map((ec) => (
              <button
                key={ec.classroom.id}
                type="button"
                className={`student-class-card${
                  selectedClassId === ec.classroom.id ? " is-selected" : ""
                }`}
                onClick={() => setSelectedClassId(ec.classroom.id)}
              >
                <header>
                  <strong>{ec.classroom.name}</strong>
                  <span>{ec.classroom.gradeLevel}</span>
                </header>
                <p>{ec.classroom.subject}</p>
                <footer>
                  <span>{ec.assignments.length} assignments</span>
                  <span>
                    {ec.progress.filter((p) => p.status === "completed").length} completed
                  </span>
                </footer>
              </button>
            ))}

            <form className="student-join-form" onSubmit={handleJoinClass}>
              <h3>Join a Class</h3>
              <input
                type="text"
                placeholder="Enter join code (e.g., CIRCF)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={10}
              />
              <button type="submit">Join Class</button>
              {joinError && <p className="join-error">{joinError}</p>}
              {joinSuccess && <p className="join-success">{joinSuccess}</p>}
            </form>
          </div>
        </section>

        <section className="student-view-panel assignments-panel">
          {selectedClass ? (
            <>
              <div className="student-panel-header">
                <div>
                  <h2>{selectedClass.classroom.name}</h2>
                  <p>{selectedClass.classroom.subject}</p>
                </div>
              </div>

              <div className="student-assignments-section">
                <header>
                  <h3>Assignments</h3>
                  <small>{selectedClass.assignments.length} total</small>
                </header>

                <div className="student-assignment-list">
                  {selectedClass.assignments.map((assignment) => {
                    const progress = getAssignmentProgress(assignment.id);
                    const statusLabel =
                      progress?.status === "completed"
                        ? "Completed"
                        : progress?.status === "in_progress"
                        ? "In Progress"
                        : "Not Started";
                    const statusClass =
                      progress?.status === "completed"
                        ? "status-completed"
                        : progress?.status === "in_progress"
                        ? "status-progress"
                        : "status-pending";

                    return (
                      <article key={assignment.id} className="student-assignment-card">
                        <header>
                          <div>
                            <strong>{assignment.title}</strong>
                            <small>Due {formatDate(new Date(assignment.dueDate).getTime())}</small>
                          </div>
                          <span
                            className="difficulty-badge"
                            style={{ borderColor: getDifficultyColor(assignment.difficulty) }}
                          >
                            {assignment.difficulty}
                          </span>
                        </header>

                        <p>{assignment.notes || "Complete this assignment."}</p>

                        <div className="assignment-meta">
                          <div className="tag-row">
                            {assignment.problemTags.map((tag) => (
                              <span key={tag} className="tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                        </div>

                        {progress?.status === "completed" && (
                          <div className="assignment-results">
                            <div>
                              <dt>Score</dt>
                              <dd>{Math.round(progress.score * 100)}%</dd>
                            </div>
                            <div>
                              <dt>Time</dt>
                              <dd>{progress.timeSpentMinutes} min</dd>
                            </div>
                            <div>
                              <dt>Attempts</dt>
                              <dd>{progress.attempts}</dd>
                            </div>
                          </div>
                        )}

                        <footer>
                          {progress?.status === "not_started" ? (
                            <Link
                              to="/app"
                              className="assignment-action-btn"
                              onClick={() => startAssignment(assignment.id)}
                            >
                              Start Assignment
                            </Link>
                          ) : progress?.status === "in_progress" ? (
                            <Link to="/app" className="assignment-action-btn">
                              Continue Working
                            </Link>
                          ) : (
                            <Link to="/app" className="assignment-action-btn secondary">
                              Review Solution
                            </Link>
                          )}
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </div>

              {selectedClass.classroom.sharedCircuits &&
                selectedClass.classroom.sharedCircuits.length > 0 && (
                  <div className="student-shared-section">
                    <header>
                      <h3>Shared Circuits</h3>
                      <small>From your teacher</small>
                    </header>
                    <div className="shared-circuit-list">
                      {selectedClass.classroom.sharedCircuits.map((circuit) => (
                        <div key={circuit.id} className="shared-circuit-card">
                          <strong>{circuit.title}</strong>
                          <small>Shared {formatDate(circuit.sharedAt)}</small>
                          {circuit.notes && <p>{circuit.notes}</p>}
                          <Link to="/app" className="view-circuit-btn">
                            Open in Builder
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          ) : (
            <div className="student-empty-state">
              <h3>No Class Selected</h3>
              <p>Join a class using the code from your teacher, or select an existing class.</p>
            </div>
          )}
        </section>

        <section className="student-view-panel progress-panel">
          <div className="student-panel-header">
            <div>
              <h2>Your Progress</h2>
              <p>Track your learning journey</p>
            </div>
          </div>

          {selectedClass ? (
            <>
              <div className="progress-summary">
                <div className="progress-ring-container">
                  <svg className="progress-ring" viewBox="0 0 100 100">
                    <circle
                      className="progress-ring-bg"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="8"
                    />
                    <circle
                      className="progress-ring-fill"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="8"
                      strokeDasharray={`${(studentStats.completed / Math.max(studentStats.total, 1)) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="progress-ring-text">
                    <strong>
                      {Math.round((studentStats.completed / Math.max(studentStats.total, 1)) * 100)}%
                    </strong>
                    <span>Complete</span>
                  </div>
                </div>
              </div>

              <div className="progress-metrics">
                <div className="metric-item">
                  <span className="metric-label">Assignments Done</span>
                  <strong>
                    {studentStats.completed} / {studentStats.total}
                  </strong>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Average Score</span>
                  <strong>{Math.round(studentStats.avgScore * 100)}%</strong>
                </div>
                <div className="metric-item">
                  <span className="metric-label">In Progress</span>
                  <strong>{studentStats.inProgress}</strong>
                </div>
              </div>

              <div className="concept-mastery">
                <h4>Concept Mastery</h4>
                <div className="mastery-tags">
                  {["series", "parallel", "ohms-law", "kvl", "kcl"].map((concept) => (
                    <div key={concept} className="mastery-tag">
                      <span>{concept}</span>
                      <div className="mastery-bar">
                        <div
                          className="mastery-fill"
                          style={{ width: `${Math.random() * 60 + 40}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="progress-empty">Select a class to view your progress.</p>
          )}
        </section>
      </div>
    </div>
  );
}
