import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">Karlbrüder</p>
        <h1>Ambiente local</h1>
        <p>
          O frontend está pronto para conversar com o FastAPI e com o
          PostgreSQL local por meio da API.
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
            <dt>Banco</dt>
            <dd>PostgreSQL local</dd>
          </div>
          <div>
            <dt>Autenticação</dt>
            <dd>Não configurada nesta etapa</dd>
          </div>
        </dl>

        <Link className="primary-link" to="/health">
          Verificar serviços
        </Link>
      </section>
    </main>
  );
}
