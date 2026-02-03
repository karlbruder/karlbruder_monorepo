import { useEffect, useState } from "react";

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
  const [db_test, setDb_test] = useState<HealthResponse | null>(null);


  const API_URL = import.meta.env.VITE_API_URL;


  useEffect(() => {
    // test Frontend -> Backend
    fetch(`${API_URL}/health`)
      .then(res => res.json())
      .then(setBackend)
      .catch(err => setError(err.message));

    // test Backend -> DB -> Frontend
    fetch(`${API_URL}/health/db`)
      .then(res => res.json())
      .then(setDb)
      .catch(err => setError(err.message));

    // test frontend -> DB 
    fetch(`http://localhost:5432`)
      .then(res => res.json())
      .then(setDb_test)
      .catch(err => setError(err.message));
    
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Health Check</h1>

      <h2>Frontend → Backend</h2>
      <pre>{JSON.stringify(backend, null, 2)}</pre>

      <h2>Backend → Database</h2>
      <pre>{JSON.stringify(db, null, 2)}</pre>

      <h2>Frontend → Database (should not work)</h2>
      <pre>{JSON.stringify(db_test, null, 2)}</pre>
      

      {error && (
        <>
          <h2>Error</h2>
          <pre>{error}</pre>
        </>
      )}
    </div>
  );
}
