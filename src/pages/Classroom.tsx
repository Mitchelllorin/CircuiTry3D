import { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import practiceProblems from "../data/practiceProblems";
import type { Classroom, ClassStudent } from "../model/classroom";
import WordMark from "../components/WordMark";
import { useClassroom } from "../context/ClassroomContext";
import "../styles/classroom.css";

const gradeLevels = ["8", "9-10", "11-12", "Higher Ed", "CTE / Makerspace"];

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

type ViewMode = "roster" | "progress" | "live" | "share";

export default function ClassroomPage() {
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

  const [viewMode, setViewMode] = useState<ViewMode>("roster");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [liveSessionActive, setLiveSessionActive] = useState(false);
  const [shareForm, setShareForm] = useState({ title: "", notes: "" });

  const classStats = useMemo(() => {
    const totalStudents = classes.reduce((sum, classroom) => sum + classroom.students.length, 0);
    const activeAssignments = classes.reduce(
      (sum, classroom) => sum + classroom.assignments.filter((assignment) => assignment.status !== "closed").length,
      0,
    );
    return { totalStudents, activeAssignments };
  }, [classes]);

  const selectedStudent = useMemo(() => {
    if (!selectedClass || !selectedStudentId) return null;
    return selectedClass.students.find((s) => s.id === selectedStudentId) ?? null;
  }, [selectedClass, selectedStudentId]);

  const studentProgressStats = useCallback((student: ClassStudent) => {
    const progress = student.progress || [];
    const completed = progress.filter((p) => p.status === "completed").length;
    const inProgress = progress.filter((p) => p.status === "in_progress").length;
    const scores = progress.filter((p) => p.status === "completed").map((p) => p.score);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const totalTime = progress.reduce((sum, p) => sum + p.timeSpentMinutes, 0);
    return { completed, inProgress, avgScore, totalTime };
  }, []);

  const handleExportReport = useCallback(() => {
    if (!selectedClass) return;

    const reportData = {
      className: selectedClass.name,
      subject: selectedClass.subject,
      gradeLevel: selectedClass.gradeLevel,
      generatedAt: new Date().toISOString(),
      summary: {
        totalStudents: selectedClass.students.length,
        activeStudents: selectedClass.analytics.activeStudents,
        completionRate: selectedClass.analytics.completionRate,
        averageTimeMinutes: selectedClass.analytics.averageTimeMinutes,
      },
      students: selectedClass.students.map((student) => ({
        name: student.name,
        email: student.email,
        status: student.status,
        ...studentProgressStats(student),
      })),
      assignments: selectedClass.assignments.map((a) => ({
        title: a.title,
        difficulty: a.difficulty,
        dueDate: a.dueDate,
        completionRate: a.performance.completionRate,
        averageScore: a.performance.averageScore,
      })),
      misconceptions: selectedClass.analytics.strugglingConcepts,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedClass.name.replace(/\s+/g, "-").toLowerCase()}-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedClass, studentProgressStats]);

  const handleShareCircuit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedClass || !shareForm.title.trim()) return;

      // In production, this would save to the classroom's sharedCircuits array
      alert(`Circuit "${shareForm.title}" shared with ${selectedClass.name}!`);
      setShareForm({ title: "", notes: "" });
    },
    [selectedClass, shareForm]
  );

  const toggleLiveSession = useCallback(() => {
    setLiveSessionActive((prev) => !prev);
  }, []);

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

  return (
    <div className="classroom-page">
      <header className="classroom-header">
        <div>
          <WordMark size="sm" decorative className="classroom-brand" />
          <p className="eyebrow">Classroom Mode</p>
          <h1>Coordinate classes, assignments, and analytics.</h1>
          <p>Track student mastery in one dashboard. Create classes, invite students, and assign practice sets with live progress.</p>
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

        <section className="classroom-panel main-panel">
          {selectedClass ? (
            <>
              <div className="classroom-panel-header">
                <div>
                  <h2>{selectedClass.name}</h2>
                  <p>
                    Join code <strong>{selectedClass.joinCode}</strong>
                  </p>
                </div>
                <div className="header-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => navigator.clipboard?.writeText(selectedClass.joinCode)}
                  >
                    Copy Code
                  </button>
                  <button
                    type="button"
                    className={`live-session-btn ${liveSessionActive ? "is-active" : ""}`}
                    onClick={toggleLiveSession}
                  >
                    {liveSessionActive ? "End Session" : "Start Live"}
                  </button>
                </div>
              </div>

              <div className="view-mode-tabs">
                <button
                  type="button"
                  className={viewMode === "roster" ? "is-active" : ""}
                  onClick={() => setViewMode("roster")}
                >
                  Roster
                </button>
                <button
                  type="button"
                  className={viewMode === "progress" ? "is-active" : ""}
                  onClick={() => setViewMode("progress")}
                >
                  Progress
                </button>
                <button
                  type="button"
                  className={viewMode === "live" ? "is-active" : ""}
                  onClick={() => setViewMode("live")}
                >
                  Live Monitor
                </button>
                <button
                  type="button"
                  className={viewMode === "share" ? "is-active" : ""}
                  onClick={() => setViewMode("share")}
                >
                  Share
                </button>
              </div>

              {viewMode === "roster" && (
                <>
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
                        <div
                          key={student.id}
                          className={`classroom-roster-row ${selectedStudentId === student.id ? "is-selected" : ""}`}
                          onClick={() => setSelectedStudentId(student.id === selectedStudentId ? null : student.id)}
                        >
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
              )}

              {viewMode === "progress" && (
                <div className="classroom-section progress-view">
                  <header>
                    <h3>Student Progress</h3>
                    <small>Individual performance tracking</small>
                  </header>

                  {selectedStudent ? (
                    <div className="student-detail-card">
                      <div className="student-detail-header">
                        <div>
                          <h4>{selectedStudent.name}</h4>
                          <small>{selectedStudent.email}</small>
                        </div>
                        <button type="button" className="ghost" onClick={() => setSelectedStudentId(null)}>
                          Back to list
                        </button>
                      </div>

                      <div className="student-stats-grid">
                        <div className="stat-card">
                          <span>Completed</span>
                          <strong>{studentProgressStats(selectedStudent).completed}</strong>
                        </div>
                        <div className="stat-card">
                          <span>In Progress</span>
                          <strong>{studentProgressStats(selectedStudent).inProgress}</strong>
                        </div>
                        <div className="stat-card">
                          <span>Avg Score</span>
                          <strong>{formatPercent(studentProgressStats(selectedStudent).avgScore)}</strong>
                        </div>
                        <div className="stat-card">
                          <span>Total Time</span>
                          <strong>{studentProgressStats(selectedStudent).totalTime} min</strong>
                        </div>
                      </div>

                      <div className="student-progress-list">
                        <h5>Assignment Progress</h5>
                        {selectedClass.assignments.map((assignment) => {
                          const progress = selectedStudent.progress?.find((p) => p.assignmentId === assignment.id);
                          return (
                            <div key={assignment.id} className="progress-item">
                              <div className="progress-item-info">
                                <strong>{assignment.title}</strong>
                                <small>{assignment.difficulty}</small>
                              </div>
                              <div className="progress-item-status">
                                <span className={`status-pill status-${progress?.status || "not_started"}`}>
                                  {progress?.status?.replace("_", " ") || "Not Started"}
                                </span>
                                {progress?.status === "completed" && (
                                  <span className="score-badge">{formatPercent(progress.score)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="student-progress-grid">
                      {selectedClass.students.map((student) => {
                        const stats = studentProgressStats(student);
                        return (
                          <button
                            key={student.id}
                            type="button"
                            className="student-progress-card"
                            onClick={() => setSelectedStudentId(student.id)}
                          >
                            <div className="student-progress-header">
                              <strong>{student.name}</strong>
                              <span className={`status-pill status-${student.status}`}>{student.status}</span>
                            </div>
                            <div className="student-progress-stats">
                              <div>
                                <span>Done</span>
                                <strong>{stats.completed}/{selectedClass.assignments.length}</strong>
                              </div>
                              <div>
                                <span>Score</span>
                                <strong>{formatPercent(stats.avgScore)}</strong>
                              </div>
                              <div>
                                <span>Time</span>
                                <strong>{stats.totalTime}m</strong>
                              </div>
                            </div>
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${(stats.completed / Math.max(selectedClass.assignments.length, 1)) * 100}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {viewMode === "live" && (
                <div className="classroom-section live-view">
                  <header>
                    <h3>Live Session Monitor</h3>
                    <small>{liveSessionActive ? "Session active" : "Session paused"}</small>
                  </header>

                  {liveSessionActive ? (
                    <>
                      <div className="live-session-banner">
                        <div className="live-indicator" />
                        <span>Live session in progress</span>
                        <small>{selectedClass.students.filter((s) => s.status === "active").length} students online</small>
                      </div>

                      <div className="live-student-grid">
                        {selectedClass.students.map((student) => {
                          const isOnline = student.status === "active";
                          const lastActivity = student.lastActiveAt ? formatDate(student.lastActiveAt) : "Never";
                          return (
                            <div key={student.id} className={`live-student-card ${isOnline ? "is-online" : ""}`}>
                              <div className="live-student-status">
                                <div className={`online-dot ${isOnline ? "is-online" : ""}`} />
                                <strong>{student.name}</strong>
                              </div>
                              <div className="live-student-activity">
                                <small>Last: {lastActivity}</small>
                                {isOnline && <span className="working-indicator">Working...</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="live-actions">
                        <button type="button" className="ghost">Send Hint to All</button>
                        <button type="button" className="ghost">Pause Session</button>
                        <Link to="/app" className="open-builder-btn">Open Builder Demo</Link>
                      </div>
                    </>
                  ) : (
                    <div className="live-inactive-state">
                      <h4>No Active Session</h4>
                      <p>Start a live session to monitor student progress in real-time during class.</p>
                      <button type="button" onClick={toggleLiveSession}>
                        Start Live Session
                      </button>
                    </div>
                  )}
                </div>
              )}

              {viewMode === "share" && (
                <div className="classroom-section share-view">
                  <header>
                    <h3>Share Circuits</h3>
                    <small>Push circuits to students</small>
                  </header>

                  <form className="share-circuit-form" onSubmit={handleShareCircuit}>
                    <label>
                      Circuit Title
                      <input
                        type="text"
                        placeholder="Series Circuit Demo"
                        value={shareForm.title}
                        onChange={(e) => setShareForm((prev) => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Notes for Students
                      <textarea
                        placeholder="Try modifying the resistor values..."
                        value={shareForm.notes}
                        onChange={(e) => setShareForm((prev) => ({ ...prev, notes: e.target.value }))}
                      />
                    </label>
                    <div className="share-actions">
                      <Link to="/app" className="ghost">Open Builder to Select</Link>
                      <button type="submit" disabled={!shareForm.title.trim()}>
                        Share with Class
                      </button>
                    </div>
                  </form>

                  {selectedClass.sharedCircuits && selectedClass.sharedCircuits.length > 0 && (
                    <div className="shared-circuits-list">
                      <h4>Previously Shared</h4>
                      {selectedClass.sharedCircuits.map((circuit) => (
                        <div key={circuit.id} className="shared-circuit-item">
                          <div>
                            <strong>{circuit.title}</strong>
                            <small>Shared {formatDate(circuit.sharedAt)}</small>
                          </div>
                          {circuit.notes && <p>{circuit.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
            {selectedClass && (
              <button type="button" className="export-btn" onClick={handleExportReport}>
                Export Report
              </button>
            )}
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
    </div>
  );
}
