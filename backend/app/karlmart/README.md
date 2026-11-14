# Karlmart

**Created**: 2026-11-14
**Last updated**: 2026-11-14

Karlmart owns shared purchase and payment records. It gives tournament registration
packages a common product, price, order, and payment model. This lets one event
sell options with different prices and included benefits.

| Package | Responsibility |
| --- | --- |
| `catalog` | Products and prices |
| `orders` | Purchases and item snapshots |
| `payments` | Recorded payments and refund obligations |

`TournamentProduct` connects an event to a catalog product. Tournaments owns
registration, capacity, payment proof review, and tournament refund rules.
Karlmart does not grant participation or move money.

Catalog and order models exist, but registration and payment workflows do not yet
use them. The application still uses the tournament's fixed fee and manual Pix
proof review. See the [tournament guide](../tournaments/README.md) and
[pricing requirements](../../../specs/tournaments/catalog.md).

The same purchase records may later support merchandise and membership. A future
Stripe integration may handle payment and recurring billing. Inventory,
subscriptions, fulfillment, and the Stripe integration are not implemented.
