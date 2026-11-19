import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { StaffTournamentError, usePublishPolicyDocument, useStaffPolicyDocuments } from "@/features/tournament/api/staff-tournaments";
import type { PolicyPurpose } from "@/features/tournament/api/tournaments";
import { PolicyDocumentButton } from "@/features/tournament/components/policy-document-button";
import { tournamentPolicies } from "@/features/tournament/utils/tournament-policies";
import { appCopy, type AppLanguage } from "@/utils/app-copy";

type Props = { token: string; userId: string; tournamentId: number; language: AppLanguage };
const maxBytes = 10 * 1024 * 1024;

function StaffPolicyUpload({ token, userId, tournamentId, language, purpose, label, document }: Props & {
  purpose: PolicyPurpose;
  label: string;
  document?: { id: number; original_file_name: string };
}) {
  const inputId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<"empty" | "large" | "type" | "name" | "publish" | null>(null);
  const publish = usePublishPolicyDocument(token, userId, tournamentId, purpose);
  const en = language === "en";
  const action = document ? (en ? "Replace" : "Substituir") : (en ? "Upload file" : "Enviar arquivo");
  const errors = {
    empty: en ? "Choose a file with content." : "Selecione um arquivo com conteúdo.",
    large: en ? "Choose a file up to 10 MiB." : "Escolha um arquivo de até 10 MiB.",
    type: en ? "Choose a PDF, JPEG, or PNG file." : "Escolha um arquivo PDF, JPEG ou PNG.",
    name: en ? "Use a file name with up to 255 characters." : "Use um nome de arquivo com até 255 caracteres.",
    publish: en ? "Could not publish the file. Try again." : "Não foi possível publicar o arquivo. Tente novamente.",
  };

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  function closeForm() {
    setOpen(false);
    setFile(null);
    setError(null);
    toggle.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publish.isPending || !file) return;
    if (!file.size) return setError("empty");
    if (file.size > maxBytes) return setError("large");
    if ([...file.name].length > 255) return setError("name");
    setError(null);
    try {
      await publish.mutateAsync(file);
      closeForm();
    } catch (caught) {
      const status = caught instanceof StaffTournamentError ? caught.status : undefined;
      setError(status === 413 ? "large" : status === 415 ? "type" : "publish");
    }
  }

  return (
    <section className="staff-policy-row" aria-labelledby={`${inputId}-title`}>
      <div className="staff-policy-heading">
        <div>
          <h3 id={`${inputId}-title`}>{label}</h3>
          {document ? (
            <PolicyDocumentButton key={document.id} label={document.original_file_name} className="staff-policy-file"
              tournamentId={tournamentId} purpose={purpose} versionId={document.id} token={token} language={language}>
              {document.original_file_name} <span aria-hidden="true">↗</span>
            </PolicyDocumentButton>
          ) : <p>{en ? "No file published." : "Nenhum arquivo publicado."}</p>}
        </div>
        <button ref={toggle} type="button" aria-expanded={open} aria-controls={`${inputId}-form`}
          aria-disabled={publish.isPending}
          onClick={() => {
            if (publish.isPending) return;
            if (open) closeForm();
            else { publish.reset(); setOpen(true); }
          }}>
          {action}
        </button>
      </div>
      {publish.isSuccess && !open && (
        <p className="staff-policy-saved" role="status">{en ? "Document published." : "Documento publicado."}</p>
      )}
      <div id={`${inputId}-form`} hidden={!open}>
        {open && (
          <form className="staff-policy-upload" onSubmit={submit}>
            <label htmlFor={inputId}>{en ? "File" : "Arquivo"}</label>
            <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              ref={input}
              aria-describedby={`${inputId}-hint`} disabled={publish.isPending}
              onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null); }} />
            <p id={`${inputId}-hint`}>PDF, JPEG {en ? "or" : "ou"} PNG · {en ? "up to" : "até"} 10 MiB</p>
            {error && <p role="alert">{errors[error]}</p>}
            {publish.isPending && <p role="status">{en ? "Publishing document..." : "Publicando documento..."}</p>}
            <div className="staff-policy-actions">
              <button type="submit" className="staff-primary-button" disabled={!file || publish.isPending}>
                {en ? "Publish document" : "Publicar documento"}
              </button>
              <button type="button" onClick={closeForm} disabled={publish.isPending}>{en ? "Cancel" : "Cancelar"}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export function StaffTournamentDocuments(props: Props) {
  const { token, userId, tournamentId, language } = props;
  const en = language === "en";
  const titleId = useId();
  const query = useStaffPolicyDocuments(token, userId, tournamentId);
  return (
    <section className="review-card staff-tournament-documents" aria-labelledby={titleId}>
      <h2 id={titleId}>{appCopy(language, "Documentos do torneio")}</h2>
      <p>{en ? "Athletes review these files before accepting the terms. Earlier acceptances keep their recorded versions."
        : "Atletas consultam estes arquivos antes do aceite. Aceites anteriores mantêm as versões registradas."}</p>
      {query.isPending && <p role="status">{en ? "Loading documents..." : "Carregando documentos..."}</p>}
      {query.isError && <p role="alert">{en ? "Could not load documents." : "Não foi possível carregar os documentos."}
        {" "}<button type="button" onClick={() => void query.refetch()}>{appCopy(language, "Tentar novamente")}</button></p>}
      {query.data && tournamentPolicies.map(([purpose, key]) => (
        <StaffPolicyUpload key={purpose} {...props} purpose={purpose} label={appCopy(language, key)} document={query.data[purpose]} />
      ))}
    </section>
  );
}
