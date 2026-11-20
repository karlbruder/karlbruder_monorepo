# Participant proof and staff payment approval

## Application Overview

Exercise the separately seeded payable registration from a fresh disposable stack. The owner and staff use separate browser contexts and synthetic accounts. The payment tournament has one available seat.

## Test Scenarios

### 1. Payment review

**Seed:** `tests/e2e/tests/seed.spec.ts`

#### 1.1. Owner submits proof and staff confirms the available seat

**File:** `tests/e2e/tests/payment-approval.spec.ts`

**Steps:**
  1. Load fixture metadata and sign in as owner@example.test in a fresh owner context. Open the independent E2E Payment registration.
    - expect: The seeded registration number and Aguardando pagamento are visible.
    - expect: The Pix instructions show fixture@example.test and the entry amount R$ 100,00.
  2. Attach a small synthetic PDF through the Comprovante de pagamento file control and submit Enviar comprovante.
    - expect: The upload succeeds through the real presigned S3 endpoint.
    - expect: The owner sees Aguardando confirmação do pagamento and a message that no seat has been reserved.
  3. Reload the owner registration.
    - expect: The pending-review status and uploaded proof remain visible and participation is not confirmed.
  4. In a separate fresh browser context, sign in as staff@example.test and open /staff/payment-reviews. Locate the seeded registration and open Revisar.
    - expect: The queue identifies the correct registration and E2E Payment tournament.
  5. Open the latest uploaded document. Confirm the review detail shows zero confirmed out of one seat.
    - expect: The synthetic proof can be accessed through its real signed download link.
    - expect: The single seat is available before approval.
  6. Enter received amount 100,00, confirm payment and eligibility review checkboxes, and approve payment. Capture the real decision response.
    - expect: The decision is attributed to the seeded staff UUID and has a review timestamp.
    - expect: The UI shows Participação confirmada and confirmed count becomes one out of one.
  7. Reload the original owner context.
    - expect: The owner sees the persisted confirmed participation status.
