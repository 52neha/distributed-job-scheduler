
import { useEffect, useState } from "react";
import "./App.css";

interface HealthResponse {
  status: string;
  service: string;
  message: string;
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkBackend() {
      try {
        const response = await fetch(
          "http://localhost:8080/api/health"
        );

        if (!response.ok) {
          throw new Error("Backend returned an error");
        }

        const data: HealthResponse = await response.json();
        setHealth(data);
      } catch {
        setError("Backend unavailable. Please start the Go server.");
      }
    }

    checkBackend();
  }, []);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Orbit Scheduler</h1>
          <p>Distributed Job Orchestration Platform</p>
        </div>

        <span className="environment">LOCAL DEVELOPMENT</span>
      </header>

      <section className="welcome">
        <p className="eyebrow">SYSTEM OVERVIEW</p>
        <h2>Welcome to your scheduler</h2>
        <p>
          Manage scheduled jobs, monitor workers and investigate
          execution failures from one place.
        </p>
      </section>

      <section className="status-card">
        <h3>Backend service</h3>

        {health ? (
          <>
            <p className="status-up">● {health.status}</p>
            <p>{health.message}</p>
            <small>Service: {health.service}</small>
          </>
        ) : error ? (
          <p className="status-error">{error}</p>
        ) : (
          <p>Checking backend connection...</p>
        )}
      </section>

      <footer>Orbit Scheduler · Development build</footer>
    </main>
  );
}

export default App;
