import { renderWithQuery as render } from "@/testing/render-with-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import TournamentPaymentPanel from "@/features/tournament/components/tournament-payment-panel";
import type { PaymentInstructions, Tournament } from "@/features/tournament/api/tournaments";

const tournament: Tournament = {
  id: 42,
  name: "Monomachia Karlbrüder 2027",
  slug: "monomachia-2027",
  modality: "longsword",
  starts_at: "2027-01-17T12:00:00Z",
  location: null,
  inscription_fee_amount: "150.00",
  registration_opens_on: "2026-11-01",
  registration_closes_on: "2026-12-31",
  new_registrations_closed: false,
  regulation: "https://example.test/regulation",
  regulation_version: "draft-regulation-v1",
  terms_version: "draft-terms-v1",
  cancellation_policy: "Policy fixture",
  equipment_requirements: null,
};

const session = {
  access_token: "test-access-token",
  user: { id: "athlete-uuid", email: "athlete@example.test" },
} as Session;

const paymentInstructions: PaymentInstructions = {
  inscription_number: "T42-000001-5",
  status: "awaiting_payment",
  inscription_fee_amount: "150.00",
  payment_due_at: "2027-02-01T23:59:59+00:00",
  payment_options: { pix: { pix_key: "EXAMPLE-FIXTURE-NOT-A-REAL-PIX-KEY" } },
  latest_payment_proof: null,
};

function ownerSignupAfterProof(status: string) {
  return {
    tournament_id: tournament.id,
    inscription_number: paymentInstructions.inscription_number,
    status,
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
        inscriptionNumber="T42-000001-5"
      />,
    );
    expect(await screen.findByRole("heading", { name: "Pagamento da inscrição" })).toBeInTheDocument();
    expect(screen.getByText("EXAMPLE-FIXTURE-NOT-A-REAL-PIX-KEY")).toBeInTheDocument();
    expect(screen.getByText("T42-000001-5")).toBeInTheDocument();
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
        inscriptionNumber="T42-000001-5"
      />,
    );
    expect(await screen.findByText(/A chave Pix deste torneio ainda não foi configurada/)).toBeInTheDocument();
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
                  status: "payment_in_review",
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
          json: async () => ownerSignupAfterProof("payment_in_review"),
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
        inscriptionNumber="T42-000001-5"
      />,
    );
    await screen.findByRole("heading", { name: "Pagamento da inscrição" });
    const fileInput = document.querySelector("#payment_proof") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [mockPdfFile()] } });
    fireEvent.submit(screen.getByRole("form", { name: "Comprovante de pagamento" }));

    await waitFor(() => expect(request).toHaveBeenCalledWith(
      "/api/tournaments/42/signups/T42-000001-5/payment-proof",
      expect.objectContaining({ method: "POST" }),
    ));
    expect(await screen.findByText("Pagamento em análise")).toBeInTheDocument();
  });

  it("keeps latest proof visible when server rejects replacement file", async () => {
    const request = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/payment")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ...paymentInstructions,
            status: "payment_in_review",
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
        inscriptionNumber="T42-000001-5"
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
