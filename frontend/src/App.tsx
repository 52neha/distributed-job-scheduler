import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./App.css";

interface HealthResponse {
  status: string;
  service: string;
  message: string;
}

interface Job {
  id: string;
  name: string;
  description: string;
  status: string;
  schedule_type: string;
  created_at: string;
  updated_at: string;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleType, setScheduleType] = useState("one_time");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError("");
    try {
      const response = await fetch("/api/v1/jobs");
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not load jobs.");
      }
      const data: Job[] = await response.json();
      setJobs(data);
    } catch (error) {
      setJobsError(
        error instanceof Error ? error.message : "Could not connect to the jobs API.",
      );
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) throw new Error("Backend returned an error.");
        const data: HealthResponse = await response.json();
        if (active) {
          setHealth(data);
          setHealthError("");
        }
      } catch {
        if (active) {
          setHealth(null);
          setHealthError("Backend unavailable. Start the Go API to connect.");
        }
      }
    }

    void loadHealth();
    void loadJobs();
    return () => {
      active = false;
    };
  }, [loadJobs]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          schedule_type: scheduleType,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not create the job.");
      }

      const createdJob: Job = await response.json();
      setJobs((currentJobs) => [
        createdJob,
        ...currentJobs.filter((job) => job.id !== createdJob.id),
      ]);
      setName("");
      setDescription("");
      setScheduleType("one_time");
      setSuccessMessage("Job created and saved to PostgreSQL.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not connect to the jobs API.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Orbit Scheduler home">
          <span className="brand-mark" aria-hidden="true">O</span>
          <span>
            <strong>Orbit Scheduler</strong>
            <small>Distributed job orchestration</small>
          </span>
        </a>
        <div className="environment">
          <span className="environment-dot" />
          LOCAL DEVELOPMENT
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">SCHEDULER OVERVIEW</p>
          <h1>Jobs, all in one place.</h1>
          <p className="welcome-copy">
            Create jobs, review their status, and keep an eye on your scheduler.
          </p>
        </div>
        <div className="connection-card">
          <span className={"connection-indicator" + (health ? " is-up" : "")} />
          <div>
            <span className="connection-label">API connection</span>
            <strong>{health ? health.status : healthError || "Checking…"}</strong>
          </div>
          {health && <span className="connection-service">{health.service}</span>}
        </div>
      </section>

      <section className="workspace" aria-label="Job management">
        <section className="panel create-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEW JOB</p>
              <h2>Create a job</h2>
            </div>
            <span className="heading-icon" aria-hidden="true">+</span>
          </div>

          <form className="job-form" onSubmit={handleSubmit}>
            <label htmlFor="job-name">Job name</label>
            <input
              id="job-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. daily-report"
              maxLength={150}
              required
            />

            <label htmlFor="job-description">Description <span>Optional</span></label>
            <textarea
              id="job-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should this job do?"
              rows={3}
            />

            <label htmlFor="schedule-type">Schedule type</label>
            <select
              id="schedule-type"
              name="schedule_type"
              value={scheduleType}
              onChange={(event) => setScheduleType(event.target.value)}
            >
              <option value="one_time">One time</option>
              <option value="recurring">Recurring</option>
            </select>

            {formError && <p className="form-message error-message" role="alert">{formError}</p>}
            {successMessage && <p className="form-message success-message" role="status">{successMessage}</p>}

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Creating job…" : "Create job"}
            </button>
          </form>
        </section>

        <section className="panel jobs-panel">
          <div className="panel-heading jobs-heading">
            <div>
              <p className="eyebrow">PERSISTED IN POSTGRESQL</p>
              <h2>Your jobs <span className="job-count">{jobs.length}</span></h2>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void loadJobs()}
              disabled={jobsLoading}
            >
              <span aria-hidden="true">↻</span>
              {jobsLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {jobsError ? (
            <div className="empty-state error-state" role="alert">
              <strong>Couldn’t load jobs</strong>
              <p>{jobsError}</p>
              <button className="secondary-button" type="button" onClick={() => void loadJobs()}>
                Try again
              </button>
            </div>
          ) : jobsLoading && jobs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-orbit" aria-hidden="true">◌</span>
              <p>Loading jobs from the API…</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-orbit" aria-hidden="true">◌</span>
              <strong>No jobs yet</strong>
              <p>Create your first job with the form.</p>
            </div>
          ) : (
            <div className="job-list" aria-live="polite">
              {jobs.map((job) => (
                <article className="job-item" key={job.id}>
                  <div className="job-main">
                    <div className="job-title-row">
                      <h3>{job.name}</h3>
                      <span className={"status-badge status-" + job.status.toLowerCase()}>
                        {job.status}
                      </span>
                    </div>
                    <p className="job-description">
                      {job.description || "No description provided"}
                    </p>
                    <div className="job-meta">
                      <span>{job.schedule_type.replace("_", " ")}</span>
                      <span>Created {formatDate(job.created_at)}</span>
                    </div>
                    <code className="job-id">{job.id}</code>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <footer className="footer">
        <span>Orbit Scheduler</span>
        <span>Development build · Go API + PostgreSQL</span>
      </footer>
    </main>
  );
}

export default App;
