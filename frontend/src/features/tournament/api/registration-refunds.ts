import { apiBaseUrl } from "@/config/environment";
import { apiFetch } from "@/lib/api-fetch";

export type RegistrationRefund = {
  amount_owed: string;
  refund_status: "awaiting_refund" | "completed";
  due_on: string;
  completed_at: string | null;
};

export type StaffRegistrationRefund = RegistrationRefund & {
  tournament_id: number;
  tournament_name: string;
  registration_number: string;
  full_name: string;
  obligated_at: string;
};

type RefundQueue = {
  items: StaffRegistrationRefund[];
  total: number;
  limit: number;
  offset: number;
};

function registrationPath(tournamentId: number, number: string) {
  return `/tournaments/${tournamentId}/registrations/${encodeURIComponent(number)}`;
}

async function request(token: string, path: string, init: RequestInit = {}) {
  const response = await apiFetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!response.ok) throw new Error(`http-${response.status}`);
  return response;
}

export async function cancelRegistration(token: string, tournamentId: number, number: string) {
  await request(token, `${registrationPath(tournamentId, number)}/cancel`, { method: "POST" });
}

export async function getRegistrationRefund(
  token: string, tournamentId: number, number: string, signal?: AbortSignal,
): Promise<RegistrationRefund | null> {
  const response = await request(token, `${registrationPath(tournamentId, number)}/refund`, { signal });
  return response.json();
}

export async function listPendingRefunds(
  token: string, filter: string, offset: number, signal?: AbortSignal,
): Promise<RefundQueue> {
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (filter) params.set("registration_number", filter);
  const response = await request(token, `/staff/tournaments/refunds?${params}`, { signal });
  return response.json();
}

export async function completeRegistrationRefund(
  token: string, refund: StaffRegistrationRefund, completedAt: string,
): Promise<{ notification_result: string }> {
  const response = await request(
    token, `/staff${registrationPath(refund.tournament_id, refund.registration_number)}/refund/complete`,
    { method: "POST", body: JSON.stringify({ completed_at: completedAt }) },
  );
  return response.json();
}
