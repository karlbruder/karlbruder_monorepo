import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteTag, getSelection, saveSelection, saveTag, TagRequestError, type TournamentTag } from "@/features/tournament/api/tournament-tags";
import { tagsKey, useTournamentTags } from "@/features/tournament/api/use-tournament-tags";
import type { AppLanguage } from "@/utils/app-copy";
import "@/features/tournament/components/tournament-tags.css";

type Common = { token: string; userId: string; tournamentId: number | string; language: AppLanguage };
export function TagPills({ tags, language }: { tags: TournamentTag[]; language: AppLanguage }) {
  return tags.length ? <ul className="tag-pills" aria-label={language === "en" ? "Selected tags" : "Tags selecionadas"}>{tags.map(tag => <li key={tag.id}>{tag.name}</li>)}</ul> : <span>{language === "en" ? "No tags" : "Sem tags"}</span>;
}
export function TagChoices({ tags, selected, onChange, disabled, language, staff = false }: { tags: TournamentTag[]; selected: number[]; onChange: (ids: number[]) => void; disabled?: boolean; language: AppLanguage; staff?: boolean }) {
  return <fieldset className="tag-choices" disabled={disabled}><legend>{language === "en" ? "Select applicable tags" : "Selecione as tags aplicáveis"}</legend>
    <p>{language === "en" ? "Optional · Select any that apply." : staff ? "Opcional · Selecione todas as tags aplicáveis." : "Opcional · Escolha quantas fizerem sentido para você."}</p>
    {tags.map(tag => <label className="tag-choice" key={tag.id}><input type="checkbox" checked={selected.includes(tag.id)} onChange={event => onChange(event.target.checked ? [...selected, tag.id] : selected.filter(id => id !== tag.id))} /><span><strong>{tag.name}</strong><span>{tag.eligibility_description}</span></span></label>)}
  </fieldset>;
}
export function RegistrationTags({ token, userId, tournamentId, number, language, closed = false, staff = false }: Common & { number: string; closed?: boolean; staff?: boolean }) {
  const en = language === "en";
  const definitions = useTournamentTags({ token, userId, tournamentId });
  const selection = useQuery({ queryKey: ["registration-tags", userId, String(tournamentId), number, staff], queryFn: ({ signal }) => getSelection(token, tournamentId, number, staff, signal) });
  const [draft, setDraft] = useState<number[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"error" | "saved" | null>(null);
  const selected = draft ?? selection.data?.map(tag => tag.id) ?? [];
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setMessage(null);
    try { const saved = await saveSelection(token, tournamentId, number, selected, staff); selection.refetch(); setDraft(saved.map(tag => tag.id)); setMessage("saved"); }
    catch { setMessage("error"); }
    finally { setSaving(false); }
  }
  if (!staff && definitions.data?.length === 0) return null;
  return <section className="registration-card tag-panel"><h2>{staff ? (en ? "Manage athlete tags" : "Gerenciar tags do atleta") : (en ? "Your tags" : "Suas tags")}</h2>
    {(definitions.isPending || selection.isPending) && <p role="status">{en ? "Loading tags..." : "Carregando tags..."}</p>}
    {(definitions.isError || selection.isError) && <p role="alert">{en ? "Could not load tags." : "Não foi possível carregar as tags."} <button type="button" onClick={() => { void definitions.refetch(); void selection.refetch(); }}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {definitions.data && selection.data && <><TagPills tags={definitions.data.filter(tag => selected.includes(tag.id))} language={language} />
      {definitions.data.length === 0 ? <p>{en ? "No tags are configured for this tournament." : "Este torneio não possui tags configuradas."}</p> : <form onSubmit={submit}><TagChoices tags={definitions.data} selected={selected} onChange={setDraft} disabled={closed || saving} language={language} staff={staff} />
      <p>{closed ? (en ? "The registration window is closed. You can no longer edit tags." : "As inscrições estão encerradas. Você não pode mais alterar suas tags.") : (en ? "Staff will check eligibility at the event." : "A equipe verificará a elegibilidade no evento.")}</p>
      {!closed && <button type="submit" disabled={saving}>{en ? "Save tags" : "Salvar tags"}</button>}</form>}
      {message === "saved" && <p role="status">{en ? "Tags saved." : "Tags salvas."}</p>}{message === "error" && <p role="alert">{en ? "Could not save tags. Try again." : "Não foi possível salvar as tags. Tente novamente."}</p>}</>}
  </section>;
}
export function StaffTagConfiguration({ token, userId, tournamentId, language }: Common) {
  const en = language === "en"; const client = useQueryClient(); const tags = useTournamentTags({ token, userId, tournamentId });
  const [editing, setEditing] = useState<number | "new" | null>(null); const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  function edit(tag?: TournamentTag) { setEditing(tag?.id ?? "new"); setName(tag?.name ?? ""); setDescription(tag?.eligibility_description ?? ""); setMessage(""); }
  async function submit(event: FormEvent) { event.preventDefault(); if (pending || editing === null) return; setPending(true); setMessage("");
    try { await saveTag(token, tournamentId, { name, eligibility_description: description }, editing === "new" ? undefined : editing); await client.invalidateQueries({ queryKey: tagsKey(userId, tournamentId) }); setEditing(null); setMessage(en ? "Tag saved." : "Tag salva."); }
    catch { setMessage(en ? "Could not save the tag." : "Não foi possível salvar a tag."); } finally { setPending(false); }
  }
  async function remove(id: number) { if (pending) return; setPending(true); setMessage(""); try { await deleteTag(token, tournamentId, id); await client.invalidateQueries({ queryKey: tagsKey(userId, tournamentId) }); setConfirmDelete(null); setMessage(en ? "Tag deleted." : "Tag excluída."); } catch (error) { setMessage(error instanceof TagRequestError && error.status === 409 ? (en ? "This tag is used by a registration and cannot be deleted." : "Esta tag está em uso por uma inscrição e não pode ser excluída.") : (en ? "Could not delete the tag." : "Não foi possível excluir a tag.")); } finally { setPending(false); } }
  return <section className="review-card tag-panel"><h2>{en ? "Tournament tags" : "Tags do torneio"}</h2><p>{en ? "Configure tags and eligibility criteria for this tournament." : "Configure as tags e os critérios de elegibilidade deste torneio."}</p>
    <button type="button" onClick={() => edit()}>{en ? "Add tag" : "Adicionar tag"}</button>
    {tags.isPending && <p role="status">{en ? "Loading tags..." : "Carregando tags..."}</p>}{tags.isError && <p role="alert">{en ? "Could not load tags." : "Não foi possível carregar as tags."} <button type="button" onClick={() => void tags.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {tags.data?.length === 0 && <p>{en ? "No tags configured." : "Nenhuma tag configurada."}</p>}
    {tags.data?.map(tag => <div className="tag-definition" key={tag.id}><strong>{tag.name}</strong><p>{tag.eligibility_description}</p><button type="button" onClick={() => edit(tag)}>{en ? "Edit" : "Editar"}</button>{" "}{confirmDelete === tag.id ? <><button type="button" disabled={pending} onClick={() => void remove(tag.id)}>{en ? "Confirm deletion" : "Confirmar exclusão"}</button>{" "}<button type="button" onClick={() => setConfirmDelete(null)}>{en ? "Cancel" : "Cancelar"}</button></> : <button type="button" onClick={() => setConfirmDelete(tag.id)}>{en ? "Delete tag" : "Excluir tag"}</button>}</div>)}
    {editing !== null && <form onSubmit={submit} className="tag-editor"><label>{en ? "Name" : "Nome"}<input required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label><label>{en ? "Eligibility description" : "Descrição de elegibilidade"}<textarea required value={description} onChange={event => setDescription(event.target.value)} /></label><button disabled={pending} type="submit">{en ? "Save tag" : "Salvar tag"}</button>{" "}<button type="button" onClick={() => setEditing(null)}>{en ? "Cancel" : "Cancelar"}</button></form>}
    {message && <p role={message.includes("Não foi") || message.includes("não pode") || message.includes("Could not") || message.includes("cannot") ? "alert" : "status"}>{message}</p>}
  </section>;
}
