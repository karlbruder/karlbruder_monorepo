import { useState, type ReactNode } from "react";
import { downloadPolicyDocument, type PolicyPurpose } from "@/features/tournament/api/tournaments";
import { appCopy, type AppLanguage } from "@/utils/app-copy";

export function PolicyDocumentButton({ label, children, className, tournamentId, purpose, versionId, token, language }: {
  label: string;
  children?: ReactNode;
  className?: string;
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
    let objectUrl: string | undefined;
    try {
      const file = await downloadPolicyDocument(tournamentId, purpose, versionId, token);
      if (tab.closed) throw new Error("policy-tab-closed");
      const url = URL.createObjectURL(file);
      objectUrl = url;
      tab.location.replace(url);
      // Keep the bytes available while the browser's viewer can still use them.
      const release = window.setInterval(() => {
        if (!tab.closed) return;
        window.clearInterval(release);
        URL.revokeObjectURL(url);
      }, 1000);
      setState("ready");
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      tab.close();
      setState("error");
    }
  }

  return (
    <span className="registration-policy">
      <button type="button" className={className ?? "registration-policy-open"} aria-disabled={pending}
        aria-label={`${label} ${appCopy(language, "(abre em outra aba)")}`} onClick={() => void openDocument()}>
        {children ?? <>{appCopy(language, "Consultar")} {label.toLowerCase()} <span aria-hidden="true">↗</span></>}
      </button>
      {pending && <span className="registration-help" role="status">{appCopy(language, "Abrindo documento…")}</span>}
      {state === "error" && <span className="registration-field-error" role="alert">{appCopy(language, "Não foi possível abrir o documento. Tente novamente.")}</span>}
    </span>
  );
}
