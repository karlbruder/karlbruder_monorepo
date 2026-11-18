import { useState } from "react";
import { getPolicyDocumentDownloadUrl, type PolicyPurpose } from "@/features/tournament/api/tournaments";
import { appCopy, type AppLanguage } from "@/utils/app-copy";

export function PolicyDocumentButton({ label, fileName, tournamentId, purpose, versionId, token, language }: {
  label: string;
  fileName?: string;
  tournamentId: number;
  purpose: PolicyPurpose;
  versionId: number;
  token: string;
  language: AppLanguage;
}) {
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  const pending = state === "loading";

  async function openDocument() {
    if (pending) return;
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      setState("error");
      return;
    }
    tab.opener = null;
    setState("loading");
    try {
      tab.location.replace(await getPolicyDocumentDownloadUrl(tournamentId, purpose, versionId, token));
      setState("ready");
    } catch {
      tab.close();
      setState("error");
    }
  }

  return (
    <div className="registration-policy">
      <button type="button" className="registration-policy-open" aria-disabled={pending} onClick={() => void openDocument()}>
        {appCopy(language, "Consultar")} {label.toLowerCase()}
        {fileName && <> · {fileName}</>}
        {" "}{appCopy(language, "(abre em outra aba)")}
      </button>
      {pending && <p className="registration-help" role="status">{appCopy(language, "Abrindo documento…")}</p>}
      {state === "error" && <p className="registration-field-error" role="alert">{appCopy(language, "Não foi possível abrir o documento. Tente novamente.")}</p>}
    </div>
  );
}
