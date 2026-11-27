import { backendFetch } from "@/lib/backend-api-client";
import { useQuery } from "@tanstack/react-query";

export type ReviewQueue = {
  items: { registration_number: string; tournament_id: number; tournament_name: string; full_name: string; document_id: number; submitted_at: string }[];
  total: number; limit: number; offset: number;
};
export type ProofReview = {
  id: number; document_id: number; decision: string; rejection_reason: string | null;
  reviewed_by_user_id: string; reviewed_at: string;
};
export type ReviewDetail = {
  registration: {
    tournament_id: number; registration_number: string; registration_status: string;
    full_name: string; social_name: string | null; birth_date: string;
    identity_document_type: string; identity_document_number: string;
    school_or_team_name: string | null; instructor_name: string | null;
    hema_experience_description: string | null; hema_started_year: number | null;
    previous_tournament_count: number; category_or_eligibility_note: string | null;
    declares_has_required_equipment: boolean; declares_physically_fit: boolean;
    accepts_rules: boolean; staff_safety_note: string | null;
  };
  tournament_name: string; registration_fee_amount: string | number | null;
  payment_due_at: string | null; competitor_capacity: number | null; confirmed_count: number;
  equipment_requirements: string | null; latest_document_id: number | null;
  documents: { id: number; document_type: string; original_file_name: string; content_type: string; size_bytes: number; submitted_at: string }[];
  reviews: ProofReview[];
};
export type ReviewDecision =
  | { document_id: number; decision: "approved"; amount_received: string; requirements_checked: true }
  | { document_id: number; decision: "rejected"; rejection_reason: string };
export type DecisionResult = {
  review: ProofReview; registration_status: string;
  notification_result: "not_required" | "sent" | "lookup_failed" | "unavailable" | "send_failed";
};
export class PaymentReviewRequestError extends Error {
  readonly status: number;
  constructor(status: number) { super(`Payment review request failed: ${status}`); this.status = status; }
}
async function request<T>(userId: string, path = "", init: RequestInit = {}): Promise<T> {
  const response = await backendFetch(`/staff/tournaments/payment-reviews${path}`, {
    ...init, headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  }, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new PaymentReviewRequestError(response.status);
  return response.json();
}
export function listPendingPaymentProofs(userId: string, filter: string, offset: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (filter) params.set("registration_number", filter);
  return request<ReviewQueue>(userId, `?${params}`, { signal });
}
export function getPaymentReview(userId: string, number: string, signal?: AbortSignal) {
  return request<ReviewDetail>(userId, `/${encodeURIComponent(number)}`, { signal });
}
export function decidePaymentReview(userId: string, number: string, decision: ReviewDecision) {
  return request<DecisionResult>(userId, `/${encodeURIComponent(number)}/decisions`, { method: "POST", body: JSON.stringify(decision) });
}
export function getReviewDocument(userId: string, number: string, id: number) {
  return request<{ download_url: string }>(userId, `/${encodeURIComponent(number)}/documents/${id}/download-url`);
}
export function usePaymentReviewQueue(userId: string, filter: string, offset: number) {
  return useQuery({ queryKey: ["payment-reviews", userId, "queue", filter, offset], queryFn: ({ signal }) => listPendingPaymentProofs(userId, filter, offset, signal) });
}
export function usePaymentReview(userId: string, number: string) {
  return useQuery({ queryKey: ["payment-reviews", userId, "detail", number], queryFn: ({ signal }) => getPaymentReview(userId, number, signal) });
}
