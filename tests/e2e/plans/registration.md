# Guest registration for a chosen tournament

## Application Overview

Exercise guest sign-in and registration through the real application, starting from a fresh disposable E2E stack. The registration tournament and independent accounts are seeded by the stack.

## Test Scenarios

### 1. Tournament registration

**Seed:** `tests/e2e/tests/seed.spec.ts`

#### 1.1. Guest signs in and registers for the selected tournament

**File:** `tests/e2e/tests/registration.spec.ts`

**Steps:**
  1. Load fixture metadata and open /tournaments/registration?tournament_id=<registration_tournament_id> in a fresh browser context.
    - expect: The chosen E2E Registration tournament and the Entrar com e-mail link are visible.
  2. Follow Entrar com e-mail, sign in as participant@example.test using the synthetic fixture password, and wait for navigation.
    - expect: The browser returns to the registration URL with the same tournament_id.
    - expect: The E2E Registration heading and registration form are visible.
  3. Select E2E entry and confirm its BRL 100.00 price. Fill the required adult personal data with a synthetic name, phone, passport, birth date 2000-01-01, country and city.
    - expect: The selected product and its current price are visible.
  4. Fill HEMA experience, previous tournament count, synthetic emergency contact name and phone. Check each of the seven required declarations and submit Enviar minha inscrição.
    - expect: The submission succeeds and the Sua inscrição panel displays a registration number and Aguardando pagamento.
    - expect: The result does not claim a reserved or confirmed seat.
  5. Open Minhas inscrições and locate the E2E Registration card.
    - expect: The same registration number and awaiting-payment status appear under the same event.
