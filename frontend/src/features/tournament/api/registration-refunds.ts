import { apiFetch } from "@/lib/api-client";

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

async function request(userId: string, path: string, init: RequestInit = {}) {
  const response = await apiFetch(`${path}`, {
    ...init,
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  }, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new Error(`http-${response.status}`);
  return response;
}

export async function cancelRegistration(userId: string, tournamentId: number, number: string) {
  const response = await apiFetch(`${registrationPath(tournamentId, number)}/cancel`, { method: "POST" }, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new Error(`http-${response.status}`);
}

export async function getRegistrationRefund(
  userId: string, tournamentId: number, number: string, signal?: AbortSignal,
): Promise<RegistrationRefund | null> {
  const response = await apiFetch(`${registrationPath(tournamentId, number)}/refund`, { signal }, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new Error(`http-${response.status}`);
  return response.json();
}

export async function listPendingRefunds(
  userId: string, filter: string, offset: number, signal?: AbortSignal,
): Promise<RefundQueue> {
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (filter) params.set("registration_number", filter);
  const response = await request(userId, `/staff/tournaments/refunds?${params}`, { signal });
  return response.json();
}

export async function completeRegistrationRefund(
  userId: string, refund: StaffRegistrationRefund, completedAt: string,
): Promise<{ notification_result: string }> {
  const response = await request(
    userId, `/staff${registrationPath(refund.tournament_id, refund.registration_number)}/refund/complete`,
    { method: "POST", body: JSON.stringify({ completed_at: completedAt }) },
  );
  return response.json();
}
