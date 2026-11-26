# Karlmart

**Created**: 2026-11-14
**Last updated**: 2026-11-26

Karlmart owns shared purchase and payment records. It gives tournament registration
packages a common product, price, order, and payment model. This lets one event
sell options with different prices and included benefits.

| Package | Responsibility |
| --- | --- |
| `catalog` | Products and prices |
| `orders` | Purchases and item snapshots |
| `payments` | Recorded payments and refund obligations |

The catalog staff API lists and updates products at `/api/staff/products`.
It creates a new price record for a changed amount and can deactivate a product.
These operations do not depend on tournaments. The tournament API supplies its
own product associations and linked-tournament projection. Product creation
within a tournament uses the catalog service in the caller's transaction.

`TournamentProduct` connects an event to a catalog product. Tournaments owns
registration, capacity, payment proof review, and tournament refund rules.
Karlmart does not grant participation or move money.

Tournament registration loads available products and creates an order item for
the selected price. Manual Pix proof review records the payment against the order.
See the [tournament guide](../tournaments/README.md) and
[pricing requirements](../../../specs/tournaments/catalog.md).

The same purchase records may later support merchandise and membership. A future
Stripe integration may handle payment and recurring billing. Inventory,
subscriptions, fulfillment, and the Stripe integration are not implemented.
