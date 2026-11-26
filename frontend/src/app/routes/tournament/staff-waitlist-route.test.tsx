import { afterEach, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { renderWithQuery } from "@/testing/render-with-query";
import { StaffLayout } from "@/app/routes/tournament/staff-layout";
import { StaffWaitlistRoute } from "@/app/routes/tournament/staff-waitlist-route";

const list = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/hooks/use-auth-session", () => ({ useAuthSession: () => ({ session: { access_token: "token", user: { id: "user", app_metadata: { karlbruder_role: "regular_user" } } } }) }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ language: "en" }) }));
vi.mock("@/features/tournament/api/paid-waitlist", () => ({ getPaidWaitlist: list, confirmPaidWaitlist: vi.fn(), WaitlistError: class extends Error {} }));
afterEach(cleanup);

it("does not request the waitlist when a signed-in user is not staff", () => {
  renderWithQuery(<MemoryRouter initialEntries={["/staff/tournaments/42/waitlist"]}><Routes><Route element={<StaffLayout />}><Route path="/staff/tournaments/:tournamentId/waitlist" element={<StaffWaitlistRoute />} /></Route></Routes></MemoryRouter>);
  expect(screen.getByRole("alert")).toHaveTextContent("Staff access required");
  expect(list).not.toHaveBeenCalled();
});
