import { backendFetch } from "@/lib/backend-api-client";

export type HealthResponse = {
  status: string;
  service?: string;
  message?: string;
  database?: string;
  result?: number;
  error?: string;
};

export async function getHealthStatus() {
  const healthResponse = await backendFetch("/health", {}, { authentication: "optional" });
  const databaseResponse = await backendFetch("/health/db", {}, { authentication: "optional" });
  for (const response of [healthResponse, databaseResponse]) {
    if (!response.ok) throw new Error(`The API responded with HTTP ${response.status}`);
  }
  return {
    backend: { status: "ok" },
    database: await databaseResponse.json() as HealthResponse,
  };
}
