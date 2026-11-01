import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type HealthResponse = {
  status: string;
  service?: string;
  message?: string;
  database?: string;
  result?: number;
  error?: string;
};

export default function Health() {
  const [backend, setBackend] = useState<HealthResponse | null>(null);
  const [db, setDb] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      const healthResponse = await fetch("/api/health");
      const databaseResponse = await fetch("/api/health/db");

      if (!healthResponse.ok) {
        throw new Error(`The API responded with HTTP ${healthResponse.status}`);
      }

      if (!databaseResponse.ok) {
        throw new Error(`The API responded with HTTP ${databaseResponse.status}`);
      }

      setBackend({ status: "ok" });
      setDb((await databaseResponse.json()) as HealthResponse);
    };

    loadStatus()
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">Diagnostics</p>
        <h1>Service status</h1>

        <div className="health-grid">
          <article>
            <h2>Frontend → Backend</h2>
            <pre>{JSON.stringify(backend, null, 2)}</pre>
          </article>

          <article>
            <h2>Backend → PostgreSQL</h2>
            <pre>{JSON.stringify(db, null, 2)}</pre>
          </article>
        </div>

        {error && (
          <div className="error-message">
            <h2>Health check failed</h2>
            <p>{error}</p>
          </div>
        )}

        <Link className="secondary-link" to="/">
          Back
        </Link>
      </section>
    </main>
  );
}