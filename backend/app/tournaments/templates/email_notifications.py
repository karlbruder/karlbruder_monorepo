"""Portuguese subject and body templates for tournament workflow emails.

Placeholders are filled by the calling workflow. Auth emails are managed in Supabase.
"""

from typing import Literal

EmailKind = Literal["confirmed", "waitlist", "rejected", "refund_completed"]

TEMPLATES: dict[EmailKind, tuple[str, str]] = {
    "confirmed": (
        "Inscrição {registration_number}: confirmada",
        "Inscrição {registration_number}\n\n"
        "Seu pagamento foi aprovado e sua inscrição no torneio está confirmada.\n\n"
        "Consulte sua inscrição no aplicativo: {link}\n",
    ),
    "waitlist": (
        "Inscrição {registration_number}: lista de espera",
        "Inscrição {registration_number}\n\n"
        "Seu pagamento foi aprovado. Sua inscrição está na lista de espera. "
        "Você não tem uma vaga confirmada. Não é necessário pagar novamente.\n\n"
        "Consulte sua inscrição no aplicativo: {link}\n",
    ),
    "rejected": (
        "Inscrição {registration_number}: comprovante rejeitado",
        "Inscrição {registration_number}\n\n"
        "Seu comprovante foi rejeitado. Motivo: {rejection_reason}\n\n"
        "Sua inscrição não foi cancelada e não tem uma vaga confirmada. "
        "Entre no aplicativo para enviar um novo comprovante: {link}\n",
    ),
    "refund_completed": (
        "Inscrição {registration_number}: reembolso concluído",
        "A equipe registrou a conclusão do reembolso da inscrição {registration_number}.\n\n"
        "Consulte sua inscrição: {link}\n",
    ),
}


def render_tournament_email(
    kind: EmailKind, *, registration_number: str, link: str, rejection_reason: str | None = None
) -> tuple[str, str]:
    """Render the subject and plain-text body for a tournament notice."""
    subject, body = TEMPLATES[kind]
    values = {"registration_number": registration_number, "link": link, "rejection_reason": rejection_reason}
    return subject.format(**values), body.format(**values)
