# Association membership

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Future capability; business rules require further discovery |
| Applications | frontend, backend |
| Sources | Product-owner overview; [#1](https://github.com/karlbruder/karlbruder_monorepo/issues/1); Website project draft about monthly membership payment tracking |

## Goal

Allow association members and students to consult their monthly membership standing, with authorized staff maintaining the relevant membership and payment records.

## Known rules

- **MEM-001:** Association membership and monthly dues are independent of tournament participation and tournament fees.
- **MEM-002:** Not every member pays membership fees. The model must accommodate exemptions rather than assuming one charge for every account.
- **MEM-003:** Veteran members can have different fees, and discounts must be accounted for. Exact eligibility, amounts, combinations, and effective dates remain unresolved.
- **MEM-004:** Members should be able to consult the membership status they are authorized to see in the application. Authentication alone must not expose other members' financial records.
- **MEM-005:** Future online payment integration may support dues. A tournament payment must not mark monthly membership as paid, or vice versa.
- **MEM-006:** Guild staff (admins) have full access to membership administration when delivered, including permitted fee adjustments, payment records, and exemptions. Other members consult their own records. The business rules for prices and exemptions remain separate from this settled permission policy.

## Scope boundary

No final membership status vocabulary, charging cycle, debt policy, recurring billing design, or accounting model has been chosen. An application account is not automatically a billable association member. Initial tournament delivery does not require building membership billing.

## Acceptance criteria for future delivery

- **MEM-AC-001:** A non-admin member can consult their own membership standing without exposing another member's financial data; guild staff retain their global admin access.
- **MEM-AC-002:** Under the chosen fee policy, an exempt member is not charged the default fee simply because they have an account.
- **MEM-AC-003:** Agreed veteran and discount rules produce the correct dues for the applicable period and preserve the reason for that amount.
- **MEM-AC-004:** Paying a tournament registration does not change the member's monthly dues standing.

These are future outcomes. They do not authorize selecting fee or debt policies during implementation of another capability.

## Open questions

None for the first tournament release. Membership is a future capability, and admin access is already decided.

## Deferred questions

- **MEM-Q1:** What establishes association membership and student enrollment, and what admission or departure rules apply?
- **MEM-Q2:** What should membership standing show: active/inactive membership, paid-through date, outstanding dues, or separate indicators?
- **MEM-Q3:** Which exemptions, veteran prices, and discounts apply, and how do their eligibility and combinations work?
- **MEM-Q4:** What billing periods, due dates, partial-month charges, pauses, cancellations, and late-payment rules apply?
- **MEM-Q5:** Should the first membership release use manual payment records/proofs or the future integrated provider?

## Related specifications

[Product](../product.md), [identity](../identity/authentication-and-access.md), [tournament payments](../tournaments/payments-and-confirmation.md), [data storage](../platform/data-storage.md).
