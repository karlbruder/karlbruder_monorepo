import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQuery } from "@/testing/render-with-query";
import { Waitlist } from "@/features/tournament/components/waitlist";
import { WaitlistError } from "@/features/tournament/api/waitlist";

const mocks = vi.hoisted(() => ({ get: vi.fn(), confirm: vi.fn(), cancel: vi.fn(), refund: vi.fn() }));
vi.mock("@/features/tournament/api/waitlist", async (importOriginal) => ({ ...await importOriginal(), getWaitlist: mocks.get, confirmWaitlist: mocks.confirm }));
vi.mock("@/features/tournament/api/registration-refunds", () => ({ cancelRegistration: mocks.cancel, getRegistrationRefund: mocks.refund }));
vi.mock("@/features/tournament/components/tournament-tags", () => ({ TagPills: () => null }));
const item = { registration_number: "R1", full_name: "Ana", social_name: null, registration_status: "waitlist", parental_consent_required: false, tags: [] };
function renderPage() { renderWithQuery(<MemoryRouter><Waitlist token="token" userId="staff" tournamentId="42" language="en" /></MemoryRouter>); }
beforeEach(() => { vi.resetAllMocks(); mocks.get.mockResolvedValue({ competitor_capacity: 2, confirmed_count: 1, registrations: [item] }); });
afterEach(cleanup);

it("shows paid participants and confirms the selected registration", async () => {
  mocks.confirm.mockResolvedValue({ registration_status: "confirmed" });
  renderPage();
  expect(await screen.findByText("Ana")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm participation" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Confirm participation" })[1]);
  expect(await screen.findByText(/participation confirmed/)).toBeInTheDocument();
  expect(mocks.confirm).toHaveBeenCalledWith("token", "42", "R1");
});

it("disables confirmation when the event is full", async () => {
  mocks.get.mockResolvedValue({ competitor_capacity: 1, confirmed_count: 1, registrations: [item] });
  renderPage();
  expect(await screen.findByRole("button", { name: "Confirm participation" })).toBeDisabled();
});

it.each([[409, /No seat is available/], [422, /parental consent form is required/]])("explains confirmation failure %s", async (status, message) => {
  mocks.confirm.mockRejectedValue(new WaitlistError(status));
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Confirm participation" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Confirm participation" })[1]);
  expect(await screen.findByText(message)).toBeInTheDocument();
});

it.each([true, false])("shows cancellation and refund outcome: refund=%s", async (refundable) => {
  mocks.cancel.mockResolvedValue(undefined);
  mocks.refund.mockResolvedValue(refundable ? { refund_status: "awaiting_refund" } : null);
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Cancel registration" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
  await waitFor(() => expect(mocks.refund).toHaveBeenCalledWith("staff", 42, "R1"));
  if (refundable) expect(await screen.findByRole("link", { name: "Open refund queue" })).toHaveAttribute("href", "/staff/refunds");
  else expect(await screen.findByText(/without an awaiting refund/)).toBeInTheDocument();
});
