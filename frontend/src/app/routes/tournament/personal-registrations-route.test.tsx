import { afterEach, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQuery } from "@/testing/render-with-query";
import { PersonalRegistrationsRoute } from "@/app/routes/tournament/personal-registrations-route";

vi.mock("@/features/auth/hooks/use-auth-session", () => ({ useAuthSession: () => ({ session: { access_token: "token", user: { id: "owner" } } }) }));
vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "token", user: { id: "owner" } } }, error: null })) } } }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ language: "en", changeLanguage: () => {} }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("lists personal registrations with their status and individual destination", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [{ tournament_id: 7, tournament_name: "Event", registration_number: "R1", registration_status: "awaiting_payment" }] })));
  renderWithQuery(<MemoryRouter><PersonalRegistrationsRoute /></MemoryRouter>);
  expect(await screen.findByText("Event")).toBeInTheDocument();
  expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
  expect(screen.getByText(/Your place is not reserved yet/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /View registration/ })).toHaveAttribute("href", "/tournaments/registration?tournament_id=7&registration_number=R1");
});

it("shows an empty state when there are no registrations", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
  renderWithQuery(<MemoryRouter><PersonalRegistrationsRoute /></MemoryRouter>);
  expect(await screen.findByText("No registrations yet.")).toBeInTheDocument();
});

it("shows an error when registrations cannot be loaded", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
  renderWithQuery(<MemoryRouter><PersonalRegistrationsRoute /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your registrations.");
});
