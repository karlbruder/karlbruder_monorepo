import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { renderWithQuery } from "@/testing/render-with-query";
import { StaffAthletesRoute } from "@/app/routes/tournament/staff-athletes-route";

vi.mock("@/features/auth/hooks/use-auth-session", () => ({ useAuthSession: () => ({ session: { access_token: "token", user: { id: "staff" } } }) }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ language: "pt" }) }));
vi.mock("@/features/tournament/api/tournament-tags", () => ({ getAthletes: async () => [{ registration_number: "R1", full_name: "Ana", social_name: null, registration_status: "cancelled", tags: [] }] }));
vi.mock("@/features/tournament/components/tournament-tags", () => ({ RegistrationTags: ({ staff }: { staff: boolean }) => <p>{staff ? "Staff tag controls" : "Owner tag controls"}</p>, TagPills: () => null }));
vi.mock("@/features/tournament/api/tournaments", () => ({
  getOwnRegistration: async () => ({ registration_number: "R1", registration_status: "cancelled", tournament_id: 42, full_name: "Ana", email: "ana@example.test", birth_date: "2000-01-01", identity_document_type: "passport", identity_document_number: "123", phone: "123", city: "Cidade", country: "Brasil", hema_experience_description: "2 anos", previous_tournament_count: 0, emergency_contact_name: "Contato", emergency_contact_phone: "456" }),
  getTournament: async () => ({ id: 42 }),
  updateRegistrationDetails: async () => undefined,
  RegistrationRequestError: class extends Error {},
}));
afterEach(cleanup);

it("opens registration management from the athlete list with details and staff tag controls", async () => {
  renderWithQuery(<MemoryRouter initialEntries={["/staff/tournaments/42/athletes"]}><Routes><Route path="/staff/tournaments/:tournamentId/athletes" element={<StaffAthletesRoute />} /><Route path="/staff/tournaments/:tournamentId/athletes/:registrationNumber" element={<StaffAthletesRoute />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("link", { name: "Gerenciar inscrição" }));
  expect(await screen.findByDisplayValue("Ana")).toBeInTheDocument();
  expect(screen.getByText("Staff tag controls")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "← Atletas do torneio" }));
  expect(await screen.findByRole("link", { name: "Gerenciar inscrição" })).toBeInTheDocument();
});
