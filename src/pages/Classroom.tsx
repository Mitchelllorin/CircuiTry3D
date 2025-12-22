import { useMemo, useState } from "react";
import practiceProblems from "../data/practiceProblems";
import type { Classroom } from "../model/classroom";
import { useClassroom } from "../context/ClassroomContext";
import { useAuth } from "../context/AuthContext";
import { classroomApi } from "../services/classroomApi";
import "../styles/classroom.css";

const gradeLevels = ["8", "9-10", "11-12", "Higher Ed", "CTE / Makerspace"];

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

type ViewMode = "teacher" | "student";

type StudentEnrollment = {
  joinCode: string;
  teacherId: string;
  classId: string;
  classSnapshot: import("../model/classroom").Classroom;
  updatedAt: number;
  joinedAt: number;
};

const STUDENT_ENROLLMENTS_KEY = "circuiTry3d.classrooms.studentEnrollments.v1";

const readEnrollments = (): StudentEnrollment[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STUDENT_ENROLLMENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as StudentEnrollment[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistEnrollments = (enrollments: StudentEnrollment[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STUDENT_ENROLLMENTS_KEY, JSON.stringify(enrollments));
  } catch {
    // ignore
  }
};

export default function Classroom() {
  const { currentUser } = useAuth();
  const {
    classes,
    selectedClass,
    selectClass,
    createClassroom,
    inviteStudent,
    scheduleAssignment,
    recordProgress,
    refreshAnalytics,
    loading,
    saving,
    error,
    lastSyncedAt,
  } = useClassroom();

  const [viewMode, setViewMode] = useState<ViewMode>("teacher");
  const [studentJoinCode, setStudentJoinCode] = useState("");
  const [studentEnrollments, setStudentEnrollments] = useState<StudentEnrollment[]>(() => readEnrollments());
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentBusy, setStudentBusy] = useState(false);

  const [classForm, setClassForm] = useState({
    name: "",
    subject: "",
    gradeLevel: gradeLevels[1],
    description: "",
  });

  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
  });

  const [assignmentForm, setAssignmentForm] = useState({
    problemId: practiceProblems[0]?.id ?? "",
    dueDate: "",
    notes: "",
  });

  const classStats = useMemo(() => {
    const totalStudents = classes.reduce((sum, classroom) => sum + classroom.students.length, 0);
    const activeAssignments = classes.reduce(
      (sum, classroom) => sum + classroom.assignments.filter((assignment) => assignment.status !== "closed").length,
      0,
    );
    return { totalStudents, activeAssignments };
  }, [classes]);

  const handleCreateClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!classForm.name.trim() || !classForm.subject.trim()) {
      return;
    }
    await createClassroom({
      name: classForm.name,
      subject: classForm.subject,
      gradeLevel: classForm.gradeLevel,
      description: classForm.description,
    });
    setClassForm((previous) => ({ ...previous, name: "", description: "" }));
  };

  const handleInviteStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClass || !studentForm.name.trim() || !studentForm.email.trim()) {
      return;
    }
    await inviteStudent({
      classId: selectedClass.id,
      name: studentForm.name,
      email: studentForm.email,
    });
    setStudentForm({ name: "", email: "" });
  };

  const handleScheduleAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClass || !assignmentForm.problemId) {
      return;
    }
    await scheduleAssignment({
      classId: selectedClass.id,
      problemId: assignmentForm.problemId,
      dueDate: assignmentForm.dueDate || undefined,
      notes: assignmentForm.notes || undefined,
    });
    setAssignmentForm((previous) => ({ ...previous, notes: "" }));
  };

  const handleQuickProgress = async (classroom: Classroom, assignmentId: string) => {
    const assignment = classroom.assignments.find((entry) => entry.id === assignmentId);
    if (!assignment) {
      return;
    }

    const nextCompletion = Math.min(1, assignment.performance.completionRate + 0.08);
    const nextScore = Math.min(1, assignment.performance.averageScore + 0.06);
    const strugglingConcepts = assignment.problemTags.slice(0, 2);

    await recordProgress({
      classId: classroom.id,
      assignmentId,
      completionRate: nextCompletion,
      averageScore: nextScore,
      strugglingConcepts,
      averageTimeMinutes: Math.max(5, assignment.performance.averageTimeMinutes - 2),
      hintsUsed: Math.max(1, assignment.performance.hintsUsed - 1),
    });
  };

  const handleStudentJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const joinCode = studentJoinCode.trim().toUpperCase();
    if (!joinCode) {
      return;
    }

    const studentId = currentUser?.id ?? `student-${Date.now()}`;
    const studentName = currentUser?.displayName ?? "Student";
    const studentEmail = currentUser?.email ?? "student@local";

    setStudentBusy(true);
    setStudentError(null);
    try {
      const response = await classroomApi.studentJoin({
        joinCode,
        student: { id: studentId, name: studentName, email: studentEmail },
      });

      const enrollment: StudentEnrollment = {
        joinCode,
        teacherId: response.teacherId,
        classId: response.classId,
        classSnapshot: response.classSnapshot,
        updatedAt: response.updatedAt,
        joinedAt: Date.now(),
      };

      setStudentEnrollments((previous) => {
        const next = [enrollment, ...previous.filter((e) => !(e.joinCode === joinCode && e.classId === response.classId))];
        persistEnrollments(next);
        return next;
      });

      setStudentJoinCode("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to join class.";
      setStudentError(message);
    } finally {
      setStudentBusy(false);
    }
  };

  const handleStudentSubmit = async (enrollment: StudentEnrollment, assignmentId: string) => {
    const studentId = currentUser?.id ?? `student-${Date.now()}`;
    const studentName = currentUser?.displayName ?? "Student";
    setStudentBusy(true);
    setStudentError(null);
    try {
      const response = await classroomApi.studentSubmit({
        joinCode: enrollment.joinCode,
        payload: {
          classId: enrollment.classId,
          assignmentId,
          studentId,
          studentName,
          status: "submitted",
          completionRate: 1,
          score: 1,
          worksheetComplete: true,
        },
      });

      setStudentEnrollments((previous) => {
        const next = previous.map((entry) =>
          entry.joinCode === enrollment.joinCode && entry.classId === enrollment.classId
            ? { ...entry, updatedAt: response.updatedAt, classSnapshot: response.classSnapshot }
            : entry,
        );
        persistEnrollments(next);
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit assignment.";
      setStudentError(message);
    } finally {
      setStudentBusy(false);
    }
  };

  const openStudentAssignment = (enrollment: StudentEnrollment, assignmentId: string) => {
    const assignment = enrollment.classSnapshot.assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      return;
    }
    const params = new URLSearchParams();
    params.set("practiceProblemId", assignment.problemId);
    params.set("classJoinCode", enrollment.joinCode);
    params.set("classId", enrollment.classId);
    params.set("assignmentId", assignmentId);
    window.location.assign(`/builder?${params.toString()}`);
  };

  return (
    <div className="classroom-page">
      <header className="classroom-header">
        <div>
          <p className="eyebrow">Classroom Mode</p>
          <h1>Coordinate classes, assignments, and analytics.</h1>
          <p>Track student mastery in one dashboard. Create classes, invite students, and assign practice sets with live progress.</p>
        </div>
        <div className="classroom-stats-row" style={{ gap: 10 }}>
          <button
            type="button"
            className="ghost"
            onClick={() => setViewMode("teacher")}
            disabled={studentBusy}
            aria-pressed={viewMode === "teacher"}
          >
            Teacher
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setViewMode("student")}
            disabled={studentBusy}
            aria-pressed={viewMode === "student"}
          >
            Student
          </button>
        </div>
        <div className="classroom-stats-row">
          <div>
            <strong>{classes.length}</strong>
            <span>Classes</span>
          </div>
          <div>
            <strong>{classStats.totalStudents}</strong>
            <span>Students</span>
          </div>
          <div>
            <strong>{classStats.activeAssignments}</strong>
            <span>Active Assignments</span>
          </div>
        </div>
      </header>

      {(loading || saving) && (
        <div className="classroom-banner" role="status">
          {loading ? "Loading classroom data..." : "Syncing updates to Netlify..."}
        </div>
      )}
      {error && (
        <div className="classroom-banner is-error" role="alert">
          {error}
        </div>
      )}

      {viewMode === "student" ? (
        <div className="classroom-grid">
          <section className="classroom-panel">
            <div className="classroom-panel-header">
              <div>
                <h2>Join a Class</h2>
                <p>Enter the join code from your teacher.</p>
              </div>
              <small>Signed in as {currentUser?.displayName ?? "Guest"}</small>
            </div>

            <form className="classroom-form" onSubmit={handleStudentJoin}>
              <input
                type="text"
                placeholder="Join code (e.g. AB12CD)"
                value={studentJoinCode}
                onChange={(event) => setStudentJoinCode(event.target.value)}
                required
              />
              <button type="submit" disabled={studentBusy}>
                {studentBusy ? "Joining..." : "Join"}
              </button>
            </form>

            {studentError && (
              <div className="classroom-banner is-error" role="alert">
                {studentError}
              </div>
            )}
          </section>

          <section className="classroom-panel">
            <div className="classroom-panel-header">
              <div>
                <h2>My Classes</h2>
                <p>Open assignments and turn them in.</p>
              </div>
              <small>{studentEnrollments.length} enrolled</small>
            </div>

            {studentEnrollments.length === 0 ? (
              <div className="classroom-empty">
                <p>No joined classes yet.</p>
              </div>
            ) : (
              <div className="assignment-list">
                {studentEnrollments.map((enrollment) => {
                  const classSnapshot = enrollment.classSnapshot;
                  const studentId = currentUser?.id ?? "";
                  return (
                    <article key={`${enrollment.joinCode}:${enrollment.classId}`} className="assignment-card">
                      <header>
                        <div>
                          <strong>{classSnapshot.name}</strong>
                          <small>
                            Join code <strong>{enrollment.joinCode}</strong>
                          </small>
                        </div>
                        <span>{classSnapshot.subject}</span>
                      </header>
                      <p>{classSnapshot.description || "Classroom assignments and practice sets."}</p>

                      <div className="assignment-list" style={{ marginTop: 10 }}>
                        {classSnapshot.assignments.map((assignment) => {
                          const submission = studentId
                            ? classSnapshot.submissions.find(
                                (s) => s.assignmentId === assignment.id && s.studentId === studentId,
                              )
                            : undefined;
                          return (
                            <article key={assignment.id} className="assignment-card" style={{ padding: 12 }}>
                              <header>
                                <div>
                                  <strong>{assignment.title}</strong>
                                  <small>Due {new Date(assignment.dueDate).toLocaleString()}</small>
                                </div>
                                <span>{assignment.difficulty}</span>
                              </header>
                              <p>{assignment.notes || "Practice set assignment."}</p>
                              <footer style={{ justifyContent: "space-between" }}>
                                <div className="tag-row">
                                  <span className="tag">
                                    Status: {submission ? submission.status : "not submitted"}
                                  </span>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button type="button" onClick={() => openStudentAssignment(enrollment, assignment.id)}>
                                    Open
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => handleStudentSubmit(enrollment, assignment.id)}
                                    disabled={studentBusy}
                                  >
                                    Turn in
                                  </button>
                                </div>
                              </footer>
                            </article>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="classroom-panel analytics-panel">
            <div className="classroom-panel-header">
              <div>
                <h2>Student Tips</h2>
                <p>Open each assignment, then turn it in.</p>
              </div>
            </div>
            <ul>
              <li>
                Use <strong>Open</strong> to launch the Builder on the right practice problem.
              </li>
              <li>
                After finishing, hit <strong>Turn in</strong> to submit.
              </li>
              <li>Your submission will show as “submitted”.</li>
            </ul>
          </section>
        </div>
      ) : (
        <div className="classroom-grid">
        <section className="classroom-panel">
          <div className="classroom-panel-header">
            <div>
              <h2>Your Classes</h2>
              <p>Switch cohorts or create a new group.</p>
            </div>
            <small>Last sync {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "—"}</small>
          </div>

          <div className="classroom-list">
            {classes.map((classroom) => (
              <button
                key={classroom.id}
                type="button"
                className={`classroom-card${selectedClass?.id === classroom.id ? " is-selected" : ""}`}
                onClick={() => selectClass(classroom.id)}
              >
                <header>
                  <strong>{classroom.name}</strong>
                  <span>{classroom.gradeLevel}</span>
                </header>
                <p>{classroom.subject}</p>
                <footer>
                  <span>{classroom.students.length} students</span>
                  <span>{classroom.assignments.length} assignments</span>
                </footer>
              </button>
            ))}
            <form className="classroom-card is-form" onSubmit={handleCreateClass}>
              <label>
                Class Name
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(event) => setClassForm((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="Semester 2 Fundamentals"
                  required
                />
              </label>
              <label>
                Subject
                <input
                  type="text"
                  value={classForm.subject}
                  onChange={(event) => setClassForm((previous) => ({ ...previous, subject: event.target.value }))}
                  placeholder="Physics / Engineering"
                  required
                />
              </label>
              <label>
                Grade Level
                <select
                  value={classForm.gradeLevel}
                  onChange={(event) => setClassForm((previous) => ({ ...previous, gradeLevel: event.target.value }))}
                >
                  {gradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <textarea
                  value={classForm.description}
                  onChange={(event) => setClassForm((previous) => ({ ...previous, description: event.target.value }))}
                  placeholder="Lab expectations, pacing details..."
                />
              </label>
              <button type="submit" disabled={saving}>
                Create Class
              </button>
            </form>
          </div>
        </section>

        <section className="classroom-panel">
          {selectedClass ? (
            <>
              <div className="classroom-panel-header">
                <div>
                  <h2>{selectedClass.name}</h2>
                  <p>
                    Join code <strong>{selectedClass.joinCode}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => navigator.clipboard?.writeText(selectedClass.joinCode)}
                >
                  Copy Code
                </button>
              </div>

              <div className="classroom-section">
                <header>
                  <h3>Invite Students</h3>
                  <small>{selectedClass.students.length} learners</small>
                </header>
                <form className="classroom-form" onSubmit={handleInviteStudent}>
                  <input
                    type="text"
                    placeholder="Student Name"
                    value={studentForm.name}
                    onChange={(event) => setStudentForm((previous) => ({ ...previous, name: event.target.value }))}
                    required
                  />
                  <input
                    type="email"
                    placeholder="student@school.org"
                    value={studentForm.email}
                    onChange={(event) => setStudentForm((previous) => ({ ...previous, email: event.target.value }))}
                    required
                  />
                  <button type="submit" disabled={saving}>
                    Send Invite
                  </button>
                </form>
                <div className="classroom-roster">
                  {selectedClass.students.map((student) => (
                    <div key={student.id} className="classroom-roster-row">
                      <div>
                        <strong>{student.name}</strong>
                        <small>{student.email}</small>
                      </div>
                      <span className={`status-pill status-${student.status}`}>{student.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="classroom-section">
                <header>
                  <h3>Assignments</h3>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => refreshAnalytics(selectedClass.id)}
                    disabled={saving}
                  >
                    Refresh analytics
                  </button>
                </header>
                <form className="classroom-form" onSubmit={handleScheduleAssignment}>
                  <select
                    value={assignmentForm.problemId}
                    onChange={(event) => setAssignmentForm((previous) => ({ ...previous, problemId: event.target.value }))}
                  >
                    {practiceProblems.map((problem) => (
                      <option key={problem.id} value={problem.id}>
                        {problem.title} · {problem.difficulty}
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={assignmentForm.dueDate}
                    onChange={(event) => setAssignmentForm((previous) => ({ ...previous, dueDate: event.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Notes / scaffolding instructions"
                    value={assignmentForm.notes}
                    onChange={(event) => setAssignmentForm((previous) => ({ ...previous, notes: event.target.value }))}
                  />
                  <button type="submit" disabled={saving}>
                    Schedule Assignment
                  </button>
                </form>

                <div className="assignment-list">
                  {selectedClass.assignments.map((assignment) => (
                    <article key={assignment.id} className="assignment-card">
                      <header>
                        <div>
                          <strong>{assignment.title}</strong>
                          <small>Due {new Date(assignment.dueDate).toLocaleString()}</small>
                        </div>
                        <span>{assignment.difficulty}</span>
                      </header>
                      <p>{assignment.notes || "Auto-generated skills check."}</p>
                      <dl>
                        <div>
                          <dt>Completion</dt>
                          <dd>{formatPercent(assignment.performance.completionRate)}</dd>
                        </div>
                        <div>
                          <dt>Avg Score</dt>
                          <dd>{formatPercent(assignment.performance.averageScore)}</dd>
                        </div>
                        <div>
                          <dt>Hints Used</dt>
                          <dd>{assignment.performance.hintsUsed}</dd>
                        </div>
                      </dl>
                      <footer>
                        <div className="tag-row">
                          {assignment.problemTags.map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                          <span className="tag">
                            Submissions: {selectedClass.submissions.filter((s) => s.assignmentId === assignment.id).length}/
                            {selectedClass.students.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickProgress(selectedClass, assignment.id)}
                          disabled={saving}
                        >
                          Log Progress
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="classroom-empty">
              <p>Select or create a class to see roster and assignments.</p>
            </div>
          )}
        </section>

        <section className="classroom-panel analytics-panel">
          <div className="classroom-panel-header">
            <div>
              <h2>Learning Analytics</h2>
              <p>Completion, time-on-task, and misconceptions.</p>
            </div>
          </div>
          {selectedClass ? (
            <>
              <div className="analytics-summary">
                <div>
                  <span>Completion Rate</span>
                  <strong>{formatPercent(selectedClass.analytics.completionRate)}</strong>
                </div>
                <div>
                  <span>Active Students</span>
                  <strong>
                    {selectedClass.analytics.activeStudents}/{selectedClass.analytics.totalStudents}
                  </strong>
                </div>
                <div>
                  <span>Average Time</span>
                  <strong>{Math.round(selectedClass.analytics.averageTimeMinutes)} min</strong>
                </div>
                <div>
                  <span>Streak Health</span>
                  <strong>{selectedClass.analytics.streakHealth}%</strong>
                </div>
              </div>

              <div className="analytics-section">
                <h4>Common Misconceptions</h4>
                {selectedClass.analytics.strugglingConcepts.length ? (
                  <ul>
                    {selectedClass.analytics.strugglingConcepts.map((entry) => (
                      <li key={entry.tag}>
                        <span>{entry.tag}</span>
                        <strong>{entry.count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No active struggle signals.</p>
                )}
              </div>

              <div className="analytics-section">
                <h4>Recent Activity</h4>
                {selectedClass.analytics.recentActivity.length ? (
                  <ul>
                    {selectedClass.analytics.recentActivity.map((entry) => (
                      <li key={entry.label}>
                        <span>{entry.label}</span>
                        <strong>{entry.value}%</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Assignments still warming up.</p>
                )}
              </div>
            </>
          ) : (
            <p>Select a class to view analytics.</p>
          )}
        </section>
      </div>
      )}
    </div>
  );
}

