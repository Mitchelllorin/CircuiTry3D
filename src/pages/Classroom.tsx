import { useMemo, useState } from "react";
import practiceProblems from "../data/practiceProblems";
import type { Classroom } from "../model/classroom";
import BrandMark from "../components/BrandMark";
import { useClassroom } from "../context/ClassroomContext";
import "../styles/classroom.css";

const gradeLevels = ["8", "9-10", "11-12", "Higher Ed", "CTE / Makerspace"];

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export default function Classroom() {
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

  return (
    <div className="classroom-page">
      <header className="classroom-header">
        <div>
          <BrandMark size="sm" decorative className="classroom-brand" />
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
    </div>
  );
}
