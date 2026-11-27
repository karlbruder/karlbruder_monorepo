import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { renderWithQuery } from "@/testing/render-with-query";
import { getStaffRegistrationTotals, listStaffRegistrations } from "@/features/tournament/api/tournaments";
import { StaffAthletesRoute } from "@/app/routes/tournament/staff-athletes-route";

vi.mock("@/features/auth/hooks/use-auth-session", () => ({ useAuthSession: () => ({ session: { access_token: "token", user: { id: "staff" } } }) }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ language: "pt" }) }));
vi.mock("@/features/tournament/components/tournament-tags", () => ({ RegistrationTags: ({ staff }: { staff: boolean }) => <p>{staff ? "Staff tag controls" : "Owner tag controls"}</p>, TagPills: () => null }));
vi.mock("@/features/tournament/api/tournaments", () => ({
  getStaffRegistrationTotals: vi.fn(async () => ({ total: 1, confirmed_count: 1, competitor_capacity: 64 as number | null })),
  listStaffRegistrations: vi.fn(async () => [{ product_name: "Plena" as string | null, registration_number: "R1", full_name: "Ana", social_name: null, registration_status: "confirmed", parental_consent_required: true, tags: [] }]),
  getOwnRegistration: async () => ({ registration_number: "R1", registration_status: "cancelled", tournament_id: 42, full_name: "Ana", email: "ana@example.test", birth_date: "2000-01-01", identity_document_type: "passport", identity_document_number: "123", phone: "123", city: "Cidade", country: "Brasil", hema_experience_description: "2 anos", previous_tournament_count: 0, emergency_contact_name: "Contato", emergency_contact_phone: "456" }),
  getTournament: async () => ({ id: 42 }),
  updateRegistrationDetails: async () => undefined,
  RegistrationRequestError: class extends Error {},
}));
afterEach(cleanup);

it("opens registration management from the athlete list with details and staff tag controls", async () => {
  renderWithQuery(<MemoryRouter initialEntries={["/staff/tournaments/42/athletes"]}><Routes><Route path="/staff/tournaments/:tournamentId/athletes" element={<StaffAthletesRoute />} /><Route path="/staff/tournaments/:tournamentId/athletes/:registrationNumber" element={<StaffAthletesRoute />} /></Routes></MemoryRouter>);
  expect(await screen.findByText(/Termo de responsabilidade assinado pendente/)).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("link", { name: "Gerenciar inscrição" }));
  expect(await screen.findByDisplayValue("Ana")).toBeInTheDocument();
  expect(screen.getByText("Staff tag controls")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "← Atletas do torneio" }));
  expect(await screen.findByRole("link", { name: "Gerenciar inscrição" })).toBeInTheDocument();
});

it("shows purchased offering and tournament totals even when search has no matches", async () => {
  renderWithQuery(<MemoryRouter initialEntries={["/staff/tournaments/42/athletes"]}><Routes><Route path="/staff/tournaments/:tournamentId/athletes" element={<StaffAthletesRoute />} /></Routes></MemoryRouter>);
  expect(await screen.findByText("Plena")).toBeInTheDocument();
  expect((await screen.findByText(/Inscrições totais: 1/)).parentElement).toHaveTextContent("Confirmadas: 1 · Capacidade: 64");
  fireEvent.change(screen.getByLabelText("Buscar por nome ou número da inscrição"), { target: { value: "nobody" } });
  expect(screen.getByText("Nenhum atleta encontrado para esta busca.")).toBeInTheDocument();
  expect(screen.getByText(/Inscrições totais: 1/).parentElement).toHaveTextContent("Confirmadas: 1 · Capacidade: 64");
});


it("shows an unlimited capacity and zero registrations in the summary", async () => {
  vi.mocked(getStaffRegistrationTotals).mockResolvedValueOnce({ total: 0, confirmed_count: 0, competitor_capacity: null });
  renderWithQuery(<MemoryRouter initialEntries={["/staff/tournaments/42/athletes"]}><Routes><Route path="/staff/tournaments/:tournamentId/athletes" element={<StaffAthletesRoute />} /></Routes></MemoryRouter>);
  expect((await screen.findByText(/Inscrições totais: 0/)).parentElement).toHaveTextContent("Confirmadas: 0 · Capacidade: Ilimitada");
});


it("shows a missing historical product and retries unavailable totals", async () => {
  vi.mocked(listStaffRegistrations).mockResolvedValueOnce([{ product_name: null, registration_number: "R1", full_name: "Ana", social_name: null, registration_status: "confirmed", parental_consent_required: false, tags: [] }]);
  vi.mocked(getStaffRegistrationTotals).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ total: 1, confirmed_count: 0, competitor_capacity: 0 });
  renderWithQuery(<MemoryRouter initialEntries={["/staff/tournaments/42/athletes"]}><Routes><Route path="/staff/tournaments/:tournamentId/athletes" element={<StaffAthletesRoute />} /></Routes></MemoryRouter>);
  expect(await screen.findByText("Indisponível")).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os totais");
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect((await screen.findByText(/Inscrições totais: 1/)).parentElement).toHaveTextContent("Confirmadas: 0 · Capacidade: 0");
});
