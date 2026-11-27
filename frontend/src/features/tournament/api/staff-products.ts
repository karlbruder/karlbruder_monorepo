import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "@/config/environment";
import { apiFetch } from "@/lib/api-fetch";
import { StaffTournamentError } from "@/features/tournament/api/staff-tournaments";

export type StaffProduct = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  price_id: number | null;
  amount: string | number | null;
  currency: string | null;
  tournaments: { id: number; name: string }[];
};
export type ProductDraft = { name: string; description: string; amount: string };
export type OfferingSelection = { existing_product_ids: number[]; new_products: ProductDraft[] };

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new StaffTournamentError(response.status, body && typeof body === "object" && "detail" in body ? body.detail : null);
  }
  return response.json();
}

export function useStaffProducts(token: string, userId: string, tournamentId?: string, enabled = true) {
  return useQuery({
    queryKey: ["staff-products", userId, tournamentId ?? "all"],
    enabled,
    queryFn: async ({ signal }) => {
      const path = tournamentId ? `/staff/tournaments/${encodeURIComponent(tournamentId)}/products` : "/staff/tournaments/products";
      const products = await request<StaffProduct[]>(token, path, { signal });
      if (!Array.isArray(products)) throw new Error("Invalid product list");
      return products;
    },
  });
}

export function addTournamentProducts(token: string, tournamentId: string, selection: OfferingSelection) {
  return request<StaffProduct[]>(token, `/staff/tournaments/${encodeURIComponent(tournamentId)}/products`, { method: "POST", body: JSON.stringify(selection) });
}
export function editProduct(token: string, id: number, details: { name: string; description: string }) {
  return request(token, `/staff/products/${id}`, { method: "PATCH", body: JSON.stringify(details) });
}
export function changeProductPrice(token: string, id: number, amount: string) {
  return request(token, `/staff/products/${id}/prices`, { method: "POST", body: JSON.stringify({ amount }) });
}
export function deactivateProduct(token: string, id: number) {
  return request(token, `/staff/products/${id}/deactivate`, { method: "POST" });
}

export function validProductDraft(draft: ProductDraft): boolean {
  const amount = draft.amount.trim();
  return !!draft.name.trim() && draft.name.trim().length <= 255 && !!draft.description.trim()
    && /^\d{1,10}(?:[.,]\d{1,2})?$/.test(amount);
}
export function normalizedDraft(draft: ProductDraft): ProductDraft {
  return { name: draft.name.trim(), description: draft.description.trim(), amount: draft.amount.trim().replace(",", ".") };
}
export function formatProductPrice(amount: StaffProduct["amount"], language: string): string {
  return amount == null ? (language === "en" ? "Price unavailable" : "Preço indisponível")
    : new Intl.NumberFormat(language === "en" ? "en-US" : "pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount));
}
