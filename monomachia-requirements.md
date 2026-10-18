# Monomachia Karlbrüder 2027 — requirements

Context from the CEO (translated from Portuguese). This is product context for the tournament registration system on the Karlbrüder site. It is not an implementation ticket.

**Event:** Monomachia Karlbrüder 2027  
**Date:** Sunday, 17 January 2027  

The participant should complete registration on the site. The organization should control sign-ups, payments, seats, and documents in an admin area.

---

## 1. Tournament page

The page should present:

- event name and visual identity
- date, time, and location
- modality: longsword
- inscription fee
- registration deadline
- total number of seats
- regulation for reading and download
- participation requirements and mandatory equipment
- cancellation and refund policy
- information about prizes and categories
- a clear “Register” call to action
- visual indication of whether registration is open, closed, or sold out

---

## 2. Registration form

The form should collect at least the following.

### Personal data

- full name
- social name, if applicable
- date of birth
- CPF or passport number (for foreigners)
- email
- phone / WhatsApp
- city, state, and country

### Sporting data

- school, club, or team
- name of the responsible instructor
- time practicing HEMA
- year training started
- prior tournament participation
- approximate number of tournaments competed in
- link or athlete ID on HEMA Ratings, when available
- handedness: right-handed, left-handed, or ambidextrous
- applicable category or special condition, per the regulation

Beginner status must not depend only on the participant’s self-selection. The system should collect the needed data. The organization confirms later whether the athlete meets the category criteria.

### Safety information

- emergency contact name and phone
- declaration that the athlete has the mandatory equipment
- declaration that the athlete is physically fit to participate
- restricted field for any condition relevant to safety during the event, only when needed

Medical information must be visible only to authorized administrators. It must not appear in spreadsheets or public pages without need.

---

## 3. Mandatory terms

Before finishing registration, the participant must check separate boxes confirming that they:

- have read and accept the regulation
- declare that the information provided is true
- acknowledge the inherent risks of practicing HEMA
- commit to using the mandatory equipment
- agree to the processing of data needed to organize the tournament
- authorize or do not authorize, separately, the use of image in photos, videos, and event publicity
- are aware of the cancellation, refund, and possible disqualification rules

There must not be a single checkbox authorizing everything. Acceptance of the regulation, data processing, and image authorization must be separate.

---

## 4. Registration process

The flow should work like this:

1. The participant fills in the form.
2. The system checks that required fields are filled.
3. The participant receives an inscription number.
4. The system shows payment instructions.
5. The participant sends the payment proof or pays through an integrated method.
6. The sign-up stays as “Awaiting payment” or “Under review”.
7. The organization checks the data, the category, and the payment.
8. After approval, the participant receives definitive confirmation by email.
9. When seats are full, new registrations go automatically to the waitlist.
10. If a seat frees up, the organization can call the next person on the waitlist.

Simply submitting the form must not guarantee a seat. The seat is confirmed only after payment and registration are validated by the organization.

---

## 5. Payment

Initially, the system may work with Pix payment and manual validation. In that case there should be:

- display of the Pix key and, if possible, a QR Code
- a field to upload the payment proof
- a deadline to complete payment
- a notice that the seat may be released if payment is not identified in time
- an admin field to mark payment as approved, refused, refunded, or pending

It is useful to leave the structure ready for a future payment gateway, card, or automatic Pix, even if that is not built now.

---

## 6. Admin area

The organization needs login-protected access to:

- view all sign-ups
- search by name, school, city, or inscription number
- filter by status
- filter by category
- change each participant’s status
- confirm or refuse payments
- record internal notes
- correct data when needed
- control available seats
- manage the waitlist
- cancel sign-ups
- record refunds
- export data as CSV or Excel
- generate an attendance list
- generate an athlete list for building brackets
- export data needed for HEMA Ratings
- see the date and time of each change

Suggested statuses:

- registration started
- awaiting payment
- payment under review
- registration confirmed
- documentation pending
- waitlist
- registration cancelled
- registration refused
- refund requested
- refunded

---

## 7. Automatic communications

The system should send automatic emails for:

- confirmation that the form was received
- payment instructions
- pending payment notice
- definitive registration confirmation
- entry onto the waitlist
- waitlist call-up
- documentation pending notice
- registration cancellation
- general organization messages

Email copy must be editable by admins without changing site code.

---

## 8. Seat control

The administrator must be able to define:

- total number of seats
- date and time registration opens
- date and time registration closes
- limit per category, if any
- payment deadline
- waitlist size

The system must not allow two people to take the last seat at the same time. Seat confirmation must be transactional and must not exceed the configured limit.

---

## 9. Public list of registered athletes

There may be a public list of confirmed participants, showing only:

- sporting name or authorized display name
- school or team
- city or country
- confirmation status

CPF, phone, email, date of birth, payment proofs, and other personal data must never appear publicly. The participant must also be able to opt out of having their name on the public list.

---

## 10. Security and data protection

The system should have:

- HTTPS
- protection against spam and automated sign-ups
- validation of uploaded files
- file size and type limits
- secure storage of payment proofs
- admin access with strong passwords
- permission levels for administrators
- an audit log of admin actions
- backups
- a specific privacy policy
- a way to correct or delete data
- a defined retention period for deleting data after the tournament
- collection of only the information that is actually needed

Sensitive data and payment proofs must not be sent as email attachments or stored in public site folders.

---

## 11. Additional technical requirements

The form must work correctly on phone and desktop. It should also:

- allow saving or recovering an incomplete registration, if feasible
- block duplicate sign-ups for the same CPF, passport, or email
- generate a unique protocol / inscription number
- show a final screen with a registration summary
- let the participant receive or look up their data
- record which regulation version the participant accepted
- record date, time, and IP of the acceptances
- keep forms and messages editable by administration
- have a test environment before going live

---

## 12. Information still to be defined

The structure should allow filling or changing later:

- inscription fee
- payment deadline
- total number of seats
- beginner category criteria
- prize categories
- minimum age
- rules for minors, if admitted
- refund policy
- mandatory equipment
- event address and schedule
- Pix key
- final regulation content

Priority is a simple experience for the participant, with full administrative control, data security, and export options for tournament organization.
