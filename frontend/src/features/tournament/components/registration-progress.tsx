import type { AppLanguage } from "@/utils/app-copy";

export function RegistrationProgress({ current, language }: { current: 1 | 2 | 3; language: AppLanguage }) {
  const steps = language === "en"
    ? ["Registration", "Pix and proof", "Follow-up"]
    : ["Inscrição", "Pix e comprovante", "Acompanhamento"];

  return (
    <ol className="registration-progress" aria-label={language === "en" ? "Registration progress" : "Etapas da inscrição"}>
      {steps.map((step, index) => (
        <li key={step} aria-current={current === index + 1 ? "step" : undefined}>
          <span aria-hidden="true">{index + 1}</span>{step}
        </li>
      ))}
    </ol>
  );
}
