import { appCopy, type AppCopyKey, type AppLanguage } from "@/utils/app-copy";

function statusLabel(status: string): AppCopyKey {
  switch (status) {
    case "awaiting_payment": return "Aguardando pagamento";
    case "awaiting_payment_confirmation": return "Aguardando confirmação do pagamento";
    case "confirmed": return "Confirmada";
    case "waitlist": return "Lista de espera";
    case "cancelled": return "Cancelada";
    default: return "Situação indisponível";
  }
}

export function RegistrationStatus({ status, language }: { status: string; language: AppLanguage }) {
  return (
    <span className={`registration-status registration-status-${status}`}>
      {appCopy(language, statusLabel(status))}
    </span>
  );
}
