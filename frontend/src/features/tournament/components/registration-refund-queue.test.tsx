import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithQuery } from "@/testing/render-with-query";
import { RegistrationRefundQueue } from "@/features/tournament/components/registration-refund-queue";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("finds a refund and records the fixed UTC−03 transfer time after full-amount confirmation", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  const refund = {
    tournament_id: 42, registration_number: "T42-1", tournament_name: "Monomachia",
    full_name: "Fixture Athlete", amount_owed: "123.45", refund_status: "awaiting_refund",
    due_on: "2026-10-30", obligated_at: "2026-10-16T18:00:00Z", completed_at: null,
  };
  let completed = false;
  const request = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/refund/complete") && init?.method === "POST") {
      completed = true;
      return Response.json({ notification_result: "send_failed" });
    }
    return Response.json({ items: completed ? [] : [refund], total: completed ? 0 : 1, limit: 20, offset: 0 });
  });
  vi.stubGlobal("fetch", request);
  renderWithQuery(<RegistrationRefundQueue token="staff" userId="admin" language="en" />);

  fireEvent.change(screen.getByLabelText("Find exact registration"), { target: { value: "  T42-1 " } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  fireEvent.click(await screen.findByRole("button", { name: "Record completed refund T42-1" }));
  expect(request.mock.calls.some(([url]) => url.includes("registration_number=T42-1"))).toBe(true);
  expect(screen.getByText(/123\.45/)).toBeVisible();
  const time = screen.getByLabelText("Transfer completed at (UTC−03:00)");
  const submit = screen.getByRole("button", { name: "Record completed transfer" });
  fireEvent.change(time, { target: { value: "2026-10-16T14:59" } });
  fireEvent.click(submit);
  expect(completed).toBe(false);
  fireEvent.click(screen.getByRole("checkbox", { name: "I confirm that the full amount was transferred." }));
  fireEvent.click(submit);
  expect(await screen.findByRole("alert")).toHaveTextContent("between cancellation and now");
  fireEvent.change(time, { target: { value: "2026-10-16T15:10:30" } });
  fireEvent.click(submit);

  expect(await screen.findByText("Refund recorded. The confirmation email could not be sent.")).toBeVisible();
  expect(await screen.findByText("No outstanding refunds.")).toBeVisible();
  expect(request).toHaveBeenCalledWith("/api/staff/tournaments/42/registrations/T42-1/refund/complete", expect.objectContaining({
    method: "POST", body: JSON.stringify({ completed_at: "2026-10-16T18:10:30.000Z" }),
  }));
});
