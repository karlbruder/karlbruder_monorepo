import { useId } from "react";
import type { AcceptanceContent } from "@/features/tournament/api/tournaments";
import { PolicyDocumentButton } from "@/features/tournament/components/policy-document-button";
import { tournamentPolicies } from "@/features/tournament/utils/tournament-policies";
import { appCopy, type AppLanguage } from "@/utils/app-copy";
import "@/features/tournament/components/tournament-documents.css";

const formats: Readonly<Record<string, string>> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
};

export function TournamentDocuments({ policies, tournamentId, token, language }: {
  policies: AcceptanceContent["policies"];
  tournamentId: number;
  token: string;
  language: AppLanguage;
}) {
  const titleId = useId();
  const t = (key: Parameters<typeof appCopy>[1]) => appCopy(language, key);
  if (!tournamentPolicies.some(([purpose]) => policies[purpose].document)) return null;

  return (
    <section className="registration-card tournament-document-card" aria-labelledby={titleId}>
      <h2 id={titleId}>{t("Documentos do torneio")}</h2>
      <ul className="tournament-document-list">
        {tournamentPolicies.map(([purpose, name]) => {
          const file = policies[purpose].document;
          if (!file) return null;
          const format = formats[file.content_type];
          return (
            <li key={`${purpose}-${file.version_id}`}>
              <PolicyDocumentButton label={`${t(name)} · ${file.original_file_name}`} className="tournament-document-tile"
                tournamentId={tournamentId} purpose={purpose} versionId={file.version_id} token={token} language={language}>
                <span className="tournament-document-icon" aria-hidden="true"><span /></span>
                <span className="tournament-document-title">
                  <strong>{t(name)}</strong>
                  <small>{format ?? file.content_type}</small>
                </span>
                <span className="tournament-document-arrow" aria-hidden="true">↗</span>
              </PolicyDocumentButton>
            </li>
          );
        })}
      </ul>
      {tournamentPolicies.map(([purpose, name]) => !policies[purpose].document && (
        <p key={purpose} className="registration-policy-missing">{t(name)}: {t("conteúdo ainda não disponível.")}</p>
      ))}
    </section>
  );
}
