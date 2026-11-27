import { useId } from "react";
import type { AcceptanceContent, AdditionalTournamentDocument } from "@/features/tournament/api/tournaments";
import { TournamentDocumentButton } from "@/features/tournament/components/tournament-document-button";
import { tournamentPolicies } from "@/features/tournament/utils/tournament-policies";
import { appCopy, type AppLanguage } from "@/utils/app-copy";
import "@/features/tournament/components/tournament-documents.css";

const formats: Readonly<Record<string, string>> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
};

export function TournamentDocuments({ policies, additionalDocuments = [], tournamentId, userId, language }: {
  policies: AcceptanceContent["policies"];
  additionalDocuments?: AdditionalTournamentDocument[];
  tournamentId: number;
  userId: string;
  language: AppLanguage;
}) {
  const titleId = useId();
  const t = (key: Parameters<typeof appCopy>[1]) => appCopy(language, key);
  const files = [
    ...tournamentPolicies.flatMap(([purpose, name]) => {
      const file = policies[purpose].document;
      return file ? [{ ...file, id: file.version_id, title: t(name), purpose }] : [];
    }),
    ...additionalDocuments.map(file => ({ ...file, purpose: undefined })),
  ];
  if (!files.length) return null;

  return (
    <section className="registration-card tournament-document-card" aria-labelledby={titleId}>
      <h2 id={titleId}>{t("Documentos do torneio")}</h2>
      <ul className="tournament-document-list">
        {files.map(file => {
          const format = formats[file.content_type];
          return (
            <li key={file.id}>
              <TournamentDocumentButton label={`${file.title} · ${file.original_file_name}`} className="tournament-document-tile"
                tournamentId={tournamentId} purpose={file.purpose} versionId={file.id} userId={userId} language={language}>
                <span className="tournament-document-icon" aria-hidden="true"><span /></span>
                <span className="tournament-document-title">
                  <strong>{file.title}</strong>
                  <small>{format ?? file.content_type}</small>
                </span>
                <span className="tournament-document-arrow" aria-hidden="true">↗</span>
              </TournamentDocumentButton>
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
