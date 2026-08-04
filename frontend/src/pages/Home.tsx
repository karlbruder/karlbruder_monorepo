import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">Karlbrüder</p>
        <h1>Local environment</h1>
        <p>
          The frontend is ready to communicate with FastAPI and the local
          PostgreSQL database through the API.
        </p>

        <dl className="status-list">
          <div>
            <dt>Frontend</dt>
            <dd>React + Vite + Nginx</dd>
          </div>
          <div>
            <dt>Backend</dt>
            <dd>FastAPI</dd>
          </div>
          <div>
            <dt>Database</dt>
            <dd>Local PostgreSQL</dd>
          </div>
          <div>
            <dt>Authentication</dt>
            <dd>Not configured at this stage</dd>
          </div>
        </dl>

        <Link className="primary-link" to="/health">
          Check services
        </Link>
      </section>
    </main>
  );
}