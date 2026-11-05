import { acceptanceEvidence } from "@/testing/acceptance-evidence";
import { renderWithQuery as render } from "@/testing/render-with-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import PaymentPanel from "@/features/tournament/components/tournament-payment-panel";
import { useState, type ComponentProps } from "react";

function TournamentPaymentPanel(props: Omit<ComponentProps<typeof PaymentPanel>, "registrationStatus" | "onRegistrationRefresh"> & { initialStatus?: string }) {
  const [status, setStatus] = useState(props.initialStatus ?? "awaiting_payment");
  return <PaymentPanel {...props} registrationStatus={status} onRegistrationRefresh={async () => { setStatus("awaiting_payment_confirmation"); }} />;
}
import type { RegistrationPaymentInstructions, Tournament } from "@/features/tournament/api/tournaments";

const tournament: Tournament = {
  id: 42,
  name: "Monomachia Karlbrüder 2027",
  slug: "monomachia-2027",
  discipline: "longsword",
  starts_at: "2027-01-17T12:00:00Z",
  location: null,
  registration_fee_amount: "150.00",
  registration_opens_on: "2026-11-01",
  registration_closes_on: "2026-12-31",
  is_registration_closed: false,
  rules_text: null,
  rules_url: "https://example.test/rules_text",
  ...acceptanceEvidence,
  rules_version: "draft-rules_text-v1",
  terms_version: "draft-terms-v1",
  cancellation_policy_text: "Policy fixture",
  cancellation_policy_url: null,
  equipment_requirements: null,
};

const session = {
  access_token: "test-access-token",
  user: { id: "athlete-uuid", email: "athlete@example.test" },
} as Session;

const paymentInstructions: RegistrationPaymentInstructions = {
  registration_number: "T42-000001-5",
  registration_fee_amount: "150.00",
  payment_due_at: "2027-02-01T23:59:59+00:00",
  payment_options: { pix: { pix_key: "EXAMPLE-FIXTURE-NOT-A-REAL-PIX-KEY" } },
  latest_payment_proof: null,
};

function ownerRegistrationAfterProof(registration_status: string) {
  return {
    tournament_id: tournament.id,
    registration_number: paymentInstructions.registration_number,
    registration_status,
    full_name: "Athlete Fixture",
    email: "athlete@example.test",
  };
}

function mockPdfFile(name = "proof.pdf") {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const file = new File([bytes], name, { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return file;
}

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Tournament payment panel", () => {
  it("shows Pix key and fee from payment instructions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => paymentInstructions,
      }),
    );
    render(
      <TournamentPaymentPanel
        tournament={tournament}
        session={session}
        registrationNumber="T42-000001-5"
      />,
    );
    expect(await screen.findByRole("heading", { name: "Pagamento da inscrição" })).toBeInTheDocument();
    expect(screen.getByText("EXAMPLE-FIXTURE-NOT-A-REAL-PIX-KEY")).toBeInTheDocument();
  });

  it("shows not configured when Pix key is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ...paymentInstructions,
          payment_options: { pix: { pix_key: null } },
        }),
      }),
    );
    render(
      <TournamentPaymentPanel
        tournament={tournament}
        session={session}
        registrationNumber="T42-000001-5"
      />,
    );
    expect(await screen.findByText(/A chave Pix deste torneio ainda não foi configurada/)).toBeInTheDocument();
  });

  it("shows an unknown current fee instead of the older catalog fee", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...paymentInstructions, registration_fee_amount: null }) }));
    render(<TournamentPaymentPanel tournament={tournament} session={session} registrationNumber={paymentInstructions.registration_number} />);
    await screen.findByRole("heading", { name: "Pagamento da inscrição" });
    expect(screen.getAllByText("A confirmar").length).toBeGreaterThan(0);
    expect(screen.queryByText(/150,00/)).not.toBeInTheDocument();
    expect(screen.getByText("EXAMPLE-FIXTURE-NOT-A-REAL-PIX-KEY")).toBeInTheDocument();
  });

  it("uploads proof through presigned flow and shows payment in review", async () => {
    let paymentFetchCount = 0;
    const request = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/payment")) {
        paymentFetchCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () =>
            paymentFetchCount > 1
              ? {
                  ...paymentInstructions,
                  registration_status: "awaiting_payment_confirmation",
                  latest_payment_proof: {
                    original_file_name: "proof.pdf",
                    content_type: "application/pdf",
                    size_bytes: 128,
                    submitted_at: "2027-01-18T12:00:00+00:00",
                  },
                }
              : paymentInstructions,
        };
      }
      if (url.endsWith("/payment-proof/upload-url")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            storage_key: "tournaments/42/staging/athlete-uuid/payment_proof/staged",
            upload_url: "https://mock.example/upload/staged",
            expires_in_seconds: 900,
            required_headers: { "Content-Type": "application/pdf" },
          }),
        };
      }
      if (url.endsWith("/payment-proof") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ownerRegistrationAfterProof("awaiting_payment_confirmation"),
        };
      }
      if (url === "https://mock.example/upload/staged" && init?.method === "PUT") {
        return { ok: true, status: 200, json: async () => null };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", request);

    render(
      <TournamentPaymentPanel
        tournament={tournament}
        session={session}
        registrationNumber="T42-000001-5"
      />,
    );
    await screen.findByRole("heading", { name: "Pagamento da inscrição" });
    const fileInput = document.querySelector("#payment_proof") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [mockPdfFile()] } });
    fireEvent.submit(screen.getByRole("form", { name: "Comprovante de pagamento" }));

    await waitFor(() => expect(request).toHaveBeenCalledWith(
      "/api/tournaments/42/registrations/T42-000001-5/payment-proof",
      expect.objectContaining({ method: "POST" }),
    ));
    expect(await screen.findByText(/Recebemos seu comprovante/)).toBeInTheDocument();
  });

  it("keeps latest proof visible when server rejects replacement file", async () => {
    const request = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/payment")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ...paymentInstructions,
            registration_status: "awaiting_payment_confirmation",
            latest_payment_proof: {
              original_file_name: "proof-old.pdf",
              content_type: "application/pdf",
              size_bytes: 128,
              submitted_at: "2027-01-18T12:00:00+00:00",
            },
          }),
        };
      }
      if (url.endsWith("/payment-proof/upload-url")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            storage_key: "tournaments/42/staging/athlete-uuid/payment_proof/staged-2",
            upload_url: "https://mock.example/upload/staged-2",
            expires_in_seconds: 900,
            required_headers: { "Content-Type": "application/pdf" },
          }),
        };
      }
      if (url.endsWith("/payment-proof") && init?.method === "POST") {
        return { ok: false, status: 415, json: async () => ({ detail: "Payment proof file type is not allowed" }) };
      }
      if (url === "https://mock.example/upload/staged-2" && init?.method === "PUT") {
        return { ok: true, status: 200, json: async () => null };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", request);

    render(
      <TournamentPaymentPanel
        tournament={tournament}
        session={session}
        registrationNumber="T42-000001-5"
        initialStatus="awaiting_payment_confirmation"
      />,
    );
    await screen.findByRole("heading", { name: "Pagamento da inscrição" });
    expect(screen.getByText(/proof-old\.pdf/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Substituir comprovante" }));
    fireEvent.change(document.querySelector("#payment_proof") as HTMLInputElement, {
      target: { files: [mockPdfFile("bad-proof.pdf")] },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Comprovante de pagamento" }));
    expect(await screen.findByText(/O servidor recusou o comprovante/)).toBeInTheDocument();
    expect(screen.getByText(/proof-old\.pdf/)).toBeInTheDocument();
  });
});

it.each(["confirmed", "waitlist", "cancelled"])("does not offer another proof for %s registrations", async status => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => paymentInstructions }));
  render(<TournamentPaymentPanel tournament={tournament} session={session} registrationNumber={paymentInstructions.registration_number} initialStatus={status} />);
  await screen.findByRole("heading", { name: "Pagamento da inscrição" });
  expect(screen.queryByText("EXAMPLE-FIXTURE-NOT-A-REAL-PIX-KEY")).not.toBeInTheDocument();
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});
it("does not offer resubmission for a cancelled registration with a rejected proof", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...paymentInstructions, current_review: { document_id: 1, decision: "rejected", rejection_reason: "Unreadable proof", reviewed_at: "2026-11-05T12:00:00Z" } }) }));
  render(<TournamentPaymentPanel tournament={tournament} session={session} registrationNumber={paymentInstructions.registration_number} initialStatus="cancelled" language="en" />);
  await screen.findByText(/registration is cancelled/);
  expect(screen.queryByRole("form", { name: "Payment proof" })).not.toBeInTheDocument();
  expect(screen.queryByText("Unreadable proof")).not.toBeInTheDocument();
});
it.each(["pt", "en"] as const)("shows a rejected proof reason and resubmits only new evidence in %s", async language => {
  let uploaded = false;
  const request = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/payment")) return { ok: true, json: async () => ({ ...paymentInstructions,
      registration_status: uploaded ? "awaiting_payment_confirmation" : "awaiting_payment",
      latest_payment_proof: { original_file_name: uploaded ? "replacement.pdf" : "rejected.pdf", content_type: "application/pdf", size_bytes: 128, submitted_at: "2026-11-04T12:00:00Z" },
      current_review: uploaded ? null : { document_id: 20, decision: "rejected", rejection_reason: "Unreadable beneficiary fixture", reviewed_at: "2026-11-04T13:00:00Z" },
    }) };
    if (url.endsWith("/upload-url")) return { ok: true, json: async () => ({ storage_key: "new-key", upload_url: "https://files.example.test/upload", expires_in_seconds: 900, required_headers: { "Content-Type": "application/pdf" } }) };
    if (init?.method === "PUT") return { ok: true };
    if (url.endsWith("/payment-proof")) { uploaded = true; return { ok: true, json: async () => ownerRegistrationAfterProof("awaiting_payment_confirmation") }; }
    throw new Error("unexpected request");
  });
  vi.stubGlobal("fetch", request);
  render(<TournamentPaymentPanel tournament={tournament} session={session} registrationNumber={paymentInstructions.registration_number} language={language} />);
  await screen.findByText("Unreadable beneficiary fixture");
  expect(screen.queryByText(/Faça o Pix|Complete the Pix transfer/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(language === "pt" ? "Comprovante de pagamento" : "Payment proof", { selector: "input" }), { target: { files: [mockPdfFile("replacement.pdf")] } });
  fireEvent.submit(screen.getByRole("form"));
  await screen.findByText(language === "pt" ? /Recebemos seu comprovante/ : /We received your proof/);
  expect(screen.getByRole("status")).toHaveTextContent(language === "pt"
    ? "Nossa equipe confere o pagamento manualmente. Essa conferência pode levar de 1 a 2 dias úteis."
    : "Our staff verify payments manually. This review may take 1 to 2 business days.");
  expect(screen.queryByText("Unreadable beneficiary fixture")).not.toBeInTheDocument();
  expect(screen.queryByText(/rejected.pdf/)).not.toBeInTheDocument();
  expect(screen.getByText(/replacement.pdf/)).toBeInTheDocument();
  expect(request.mock.calls.find(([, init]) => init?.method === "POST" && init?.body)?.[1]?.body).toBe(JSON.stringify({ storage_key: "new-key", original_file_name: "replacement.pdf" }));
});
it("rejects an invalid file locally without a storage request", async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => paymentInstructions }); vi.stubGlobal("fetch", request);
  render(<TournamentPaymentPanel tournament={tournament} session={session} registrationNumber={paymentInstructions.registration_number} />);
  await screen.findByRole("form");
  fireEvent.change(screen.getByLabelText("Comprovante de pagamento", { selector: "input" }), { target: { files: [new File(["bad"], "file.txt", { type: "text/plain" })] } });
  fireEvent.submit(screen.getByRole("form")); await screen.findByRole("alert"); expect(request).toHaveBeenCalledTimes(1);
});
it("reports inaccessible registrations instead of offering payment or creation", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ detail: "Not found" }) }));
  render(<TournamentPaymentPanel tournament={tournament} session={session} registrationNumber="foreign" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Inscrição não encontrada ou sem acesso para esta conta.");
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});
