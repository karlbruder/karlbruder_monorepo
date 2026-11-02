export type HealthResponse = {
  status: string;
  service?: string;
  message?: string;
  database?: string;
  result?: number;
  error?: string;
};

export async function getHealthStatus() {
  const healthResponse = await fetch("/api/health");
  const databaseResponse = await fetch("/api/health/db");
  for (const response of [healthResponse, databaseResponse]) {
    if (!response.ok) throw new Error(`The API responded with HTTP ${response.status}`);
  }
  return {
    backend: { status: "ok" },
    database: await databaseResponse.json() as HealthResponse,
  };
}
