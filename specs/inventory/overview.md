# Equipment inventory

| Field | Value |
| --- | --- |
| Status | Draft |
| Scope | Future capability: guild equipment inventory |
| Applications | frontend, backend |
| Sources | Product-owner overview and answers in this document |

## Goal

Maintain a simple inventory of shared guild equipment within the same application that serves tournaments and association membership.

## Guild equipment

Guild equipment is shared equipment purchased and maintained using guild funds. Monthly membership payments contribute to the treasury, and the board of directors decides how those funds are used, including equipment purchases and maintenance.

Guild members may use the equipment. This physical use does not grant access to the inventory-management interface.

## Known rules

- **INV-001:** Equipment inventory is an association capability. Equipment records must not depend on the existence of a particular tournament.
- **INV-002:** The frontend provides the inventory interface and the backend owns its data and business rules.
- **INV-003:** Only guild staff with the admin role may view, create, update, or retire inventory records. Regular users and guild members without the admin role have no inventory-interface or inventory-API access.
- **INV-004:** Inventory records describe equipment, its type, quantity, and condition. The inventory does not require tracking each physical unit individually.
- **INV-005:** Guild equipment is available for use by guild members. The platform does not manage equipment loans to students or tournament participants.
- **INV-006:** Tournaments do not reserve guild equipment. Inventory records and quantities do not depend on tournament registration or attendance.
- **INV-007:** This capability tracks condition but does not track locations, maintenance histories, losses, or individual responsibility assignments.

## Inventory information

| Information | Meaning |
| --- | --- |
| Equipment | Identifies the equipment represented by the record |
| Type | The kind of equipment |
| Quantity | The number of units represented by the record |
| Condition | Descriptive condition, such as bad, good, or brand new |

The condition examples describe the intended level of detail. They do not establish a complete fixed list of allowed values.

## Administrative access

The initial admins identified by the product owner are Carlos, Cris, Vetor, Matheus, and Francesco. Preserve these supplied names until they are mapped to verified accounts. Access is granted through the admin role, not by matching a display name.

## Scope boundary

The future inventory capability provides an admin-only equipment list and record management with equipment, type, quantity, and condition.

Loans and returns, tournament reservations, per-item asset tracking, location tracking, maintenance histories, loss tracking, and responsibility assignments are outside this scope. Treasury management, purchase approval, and accounting are also outside the inventory capability; the funding context above does not add those workflows.

## Acceptance criteria for future delivery

- **INV-AC-001:** An authenticated admin can consult the guild equipment inventory independently of tournament registration.
- **INV-AC-002:** Unauthorized users cannot create or modify equipment records through the API.
- **INV-AC-003:** An authenticated regular user or guild member without the admin role cannot view inventory records through the UI or API.
- **INV-AC-004:** An admin can create and update records containing equipment, type, quantity, and condition, and can retire a record.
- **INV-AC-005:** Tournament registration does not reserve equipment or reduce inventory quantities.

These criteria apply when the future inventory capability is delivered. They do not imply that it is implemented in the current application.

## Implementation decisions

The five original scope questions are resolved by the rules above. Account mapping, field validation, and whether retirement means archive or deletion can be specified in the future delivery issue without expanding the agreed capability.

## Related specifications

[Product](../product.md), [identity](../identity/authentication-and-access.md), [data storage](../platform/data-storage.md).
