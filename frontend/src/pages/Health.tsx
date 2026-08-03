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
    const getHealth = async (path: string) => {
      const response = await fetch(`/api${path}`);

      if (!response.ok) {
        throw new Error(`The API responded with HTTP ${response.status}`);
      }

      return response.json() as Promise<HealthResponse>;
    };

    Promise.all([getHealth("/health"), getHealth("/health/db")])
      .then(([backendResponse, dbResponse]) => {
        setBackend(backendResponse);
        setDb(dbResponse);
      })
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