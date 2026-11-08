import { useState, type FormEvent } from "react";
import {
  applicationRoles,
  StaffAccountError,
  useStaffAccounts,
  useUpdateStaffAccountRole,
  type ApplicationRole,
  type StaffAccount,
} from "@/features/staff-accounts/api/staff-accounts";
import type { AppLanguage } from "@/utils/app-copy";
import "@/features/staff-accounts/components/staff-accounts.css";

const pageSize = 25;

const copy = {
  en: {
    title: "User accounts",
    sessionNote: "Existing sessions may keep their previous permissions until the session refreshes or expires.",
    search: "Search by email or account ID",
    loading: "Loading user accounts…",
    loadError: "Could not load user accounts.",
    forbidden: "Staff access required.",
    retry: "Try again",
    empty: "No matching accounts.",
    noEmail: "No email address",
    currentRole: "Current role",
    role: "New role",
    save: "Save role",
    saving: "Saving role…",
    saved: "Role updated.",
    missing: "This account no longer exists.",
    saveError: "Could not update the role. Try again.",
    pages: "Account pages",
    previous: "Previous",
    next: "Next",
    regular_user: "Regular user",
    guild_member: "Guild member",
    admin: "Admin",
  },
  pt: {
    title: "Contas de usuários",
    sessionNote: "As sessões existentes podem manter as permissões anteriores até serem renovadas ou expirarem.",
    search: "Buscar por e-mail ou ID da conta",
    loading: "Carregando contas de usuários…",
    loadError: "Não foi possível carregar as contas de usuários.",
    forbidden: "Acesso restrito à equipe.",
    retry: "Tentar novamente",
    empty: "Nenhuma conta encontrada.",
    noEmail: "Sem endereço de e-mail",
    currentRole: "Função atual",
    role: "Nova função",
    save: "Salvar função",
    saving: "Salvando função…",
    saved: "Função atualizada.",
    missing: "Esta conta não existe mais.",
    saveError: "Não foi possível atualizar a função. Tente novamente.",
    pages: "Páginas de contas",
    previous: "Anterior",
    next: "Próxima",
    regular_user: "Usuário comum",
    guild_member: "Membro da guilda",
    admin: "Administrador",
  },
};

type PanelProps = { token: string; actorId: string; language: AppLanguage };

function AccountRoleForm({ account, token, actorId, language }: PanelProps & { account: StaffAccount }) {
  const labels = copy[language];
  const [draft, setDraft] = useState<ApplicationRole | null>(null);
  const update = useUpdateStaffAccountRole(token, actorId, account.id);
  const role = draft ?? account.role;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (update.isPending || role === account.role) return;
    update.mutate(role, { onSuccess: () => setDraft(null) });
  }

  const errorStatus = update.error instanceof StaffAccountError ? update.error.status : null;
  const errorMessage = errorStatus === 404 ? labels.missing
    : errorStatus === 403 ? labels.forbidden
    : labels.saveError;

  return (
    <li className="staff-account-card">
      <h2>{account.email ?? labels.noEmail}</h2>
      <p>{account.id}</p>
      <p>{labels.currentRole}: {labels[account.role]}</p>
      <form className="staff-role-form" onSubmit={submit}>
        <label>
          {labels.role}{" "}
          <select
            value={role}
            disabled={update.isPending}
            onChange={(event) => {
              setDraft(event.target.value as ApplicationRole);
              update.reset();
            }}
          >
            {applicationRoles.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
          </select>
        </label>{" "}
        <button type="submit" disabled={update.isPending || role === account.role}>
          {update.isPending ? labels.saving : labels.save}
        </button>
        {update.isSuccess && <p role="status">{labels.saved}</p>}
        {update.isError && <p role="alert">{errorMessage}</p>}
      </form>
    </li>
  );
}

export function StaffAccountPanel({ token, actorId, language }: PanelProps) {
  const labels = copy[language];
  const accounts = useStaffAccounts(token, actorId);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const term = search.trim().toLowerCase();
  const matches = (accounts.data ?? []).filter((account) =>
    account.id.toLowerCase().includes(term) || account.email?.toLowerCase().includes(term),
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const status = accounts.error instanceof StaffAccountError ? accounts.error.status : null;
  const showResults = accounts.data !== undefined && status !== 401 && status !== 403;

  return (
    <section className="staff-accounts">
      <h1>{labels.title}</h1>
      <p>{labels.sessionNote}</p>
      <label className="staff-account-search">
        {labels.search}{" "}
        <input type="search" value={search} onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }} />
      </label>
      {accounts.isPending && <p role="status">{labels.loading}</p>}
      {accounts.isError && (
        <p role="alert">
          {status === 403 ? labels.forbidden : labels.loadError}{" "}
          <button type="button" onClick={() => void accounts.refetch()}>{labels.retry}</button>
        </p>
      )}
      {showResults && (matches.length === 0
        ? <p>{labels.empty}</p>
        : <ul className="staff-account-list">{matches.slice(start, start + pageSize).map((account) =>
            <AccountRoleForm key={account.id} account={account} token={token} actorId={actorId} language={language} />,
          )}</ul>)}
      {showResults && pageCount > 1 && (
        <nav aria-label={labels.pages}>
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            {labels.previous}
          </button>{" "}
          <span>{currentPage} / {pageCount}</span>{" "}
          <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
            {labels.next}
          </button>
        </nav>
      )}
    </section>
  );
}
