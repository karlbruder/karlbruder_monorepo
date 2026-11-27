import { currentSessionGeneration } from "@/lib/session-generation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addTournamentProducts, changeProductPrice, deactivateProduct, editProduct, formatProductPrice, normalizedDraft, useStaffProducts, validProductDraft, type OfferingSelection, type StaffProduct } from "@/features/tournament/api/staff-products";
import { StaffTournamentError } from "@/features/tournament/api/staff-tournaments";
import { TournamentProductSelection } from "@/features/tournament/components/tournament-product-selection";
import type { AppLanguage } from "@/utils/app-copy";

const emptySelection = (): OfferingSelection => ({ existing_product_ids: [], new_products: [] });
function message(error: unknown, en: boolean) {
  if (error instanceof StaffTournamentError && (error.status === 401 || error.status === 403)) return en ? "Access denied. Sign in again with a staff account." : "Acesso negado. Entre novamente com uma conta da equipe.";
  if (error instanceof StaffTournamentError && error.status === 409) return en ? "The product changed or is already offered. Refresh and try again." : "O produto mudou ou já está no torneio. Atualize e tente novamente.";
  return en ? "Could not save. Your changes are still here. Try again." : "Não foi possível salvar. Suas alterações foram mantidas. Tente novamente.";
}

export function TournamentProducts({ userId, tournamentId, language }: { userId: string; tournamentId: string; language: AppLanguage }) {
  const en = language === "en";
  const client = useQueryClient();
  const offered = useStaffProducts(userId, tournamentId);
  const catalog = useStaffProducts(userId);
  const [adding, setAdding] = useState(false);
  const [draftSelection, setSelection] = useState<OfferingSelection>(emptySelection);
  const selection = {
    ...draftSelection,
    existing_product_ids: draftSelection.existing_product_ids.filter(id => !offered.data?.some(product => product.id === id)),
  };
  const [error, setError] = useState<unknown>(null);
  const [invalid, setInvalid] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["staff-products"] });
  }
  async function add(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    if ((!selection.existing_product_ids.length && !selection.new_products.length) || selection.new_products.some(draft => !validProductDraft(draft))) { setInvalid(true); return; }
    const generation = currentSessionGeneration();
    setInvalid(false); setError(null); setSaved(false); inFlight.current = true; setPending(true);
    try {
      await addTournamentProducts(userId, tournamentId, { ...selection, new_products: selection.new_products.map(normalizedDraft) });
      if (generation !== currentSessionGeneration()) return;
      setSelection(emptySelection()); setAdding(false); setSaved(true);
      await refresh();
    } catch (caught) { if (generation === currentSessionGeneration()) setError(caught); } finally { inFlight.current = false; setPending(false); }
  }
  return <section className="review-card tournament-products" aria-labelledby="tournament-products-title">
    <h2 id="tournament-products-title">{en ? "Registration products" : "Produtos de inscrição"}</h2>
    {offered.isLoading && <p role="status">{en ? "Loading products..." : "Carregando produtos..."}</p>}
    {offered.isError && <p role="alert">{en ? "Could not load products." : "Não foi possível carregar os produtos."} <button type="button" onClick={() => void offered.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {offered.data && <>
      {offered.data.length === 0 && <p>{en ? "No products offered for this tournament." : "Nenhum produto oferecido neste torneio."}</p>}
      {offered.data.map(product => <ProductChange key={product.id} product={product} userId={userId} language={language} onSaved={refresh} />)}
      {!adding && <button type="button" onClick={() => { setAdding(true); setSaved(false); }}>{en ? "Add product" : "Adicionar produto"}</button>}
      {saved && <p role="status">{en ? "Products added." : "Produtos adicionados."}</p>}
      {adding && <form onSubmit={add}>
        {catalog.isLoading && <p role="status">{en ? "Loading available products..." : "Carregando produtos disponíveis..."}</p>}
        {catalog.isError && <p role="alert">{en ? "Could not load available products." : "Não foi possível carregar os produtos disponíveis."} <button type="button" onClick={() => void catalog.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
        <TournamentProductSelection products={catalog.data ?? []} excludeIds={offered.data.map(product => product.id)} selection={selection} onChange={setSelection} language={language} />
        {invalid && <p role="alert">{en ? "Select a product or enter valid product details and BRL prices." : "Selecione um produto ou informe dados e preços em BRL válidos."}</p>}
        {error != null && <p role="alert">{message(error, en)} {error instanceof StaffTournamentError && (error.status === 404 || error.status === 409) && <button type="button" onClick={() => void refresh()}>{en ? "Refresh products" : "Atualizar produtos"}</button>}</p>}
        <div className="tournament-product-actions"><button className="staff-primary-button" disabled={pending}>{pending ? (en ? "Saving..." : "Salvando...") : (en ? "Add to tournament" : "Adicionar ao torneio")}</button><button type="button" disabled={pending} onClick={() => { setAdding(false); setError(null); setInvalid(false); }}>{en ? "Cancel" : "Cancelar"}</button></div>
      </form>}
    </>}
  </section>;
}

type Change = "details" | "price" | "deactivate";
function ProductChange({ product, userId, language, onSaved }: { product: StaffProduct; userId: string; language: AppLanguage; onSaved: () => Promise<void> }) {
  const en = language === "en";
  const [action, setAction] = useState<Change | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [amount, setAmount] = useState(String(product.amount ?? ""));
  const [error, setError] = useState<unknown>(null);
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const priceInput = useRef<HTMLInputElement>(null);
  const productHeading = useRef<HTMLHeadingElement>(null);
  const previousAction = useRef<Change | null>(null);
  useEffect(() => {
    if (confirming) reviewHeading.current?.focus();
    else if (action === "details") nameInput.current?.focus();
    else if (action === "price") priceInput.current?.focus();
    else if (!action && previousAction.current) productHeading.current?.focus();
    previousAction.current = action;
  }, [action, confirming]);
  function begin(next: Change) { setName(product.name); setDescription(product.description); setAmount(String(product.amount ?? "")); setAction(next); setConfirming(next === "deactivate"); setError(null); setSaved(false); setInvalid(false); }
  function review(event: FormEvent) {
    event.preventDefault();
    if (!validProductDraft({ name, description, amount: action === "price" ? amount : "0" })) { setInvalid(true); return; }
    setInvalid(false); setConfirming(true);
  }
  async function confirm() {
    if (!action || inFlight.current) return;
    const generation = currentSessionGeneration();
    inFlight.current = true; setPending(true); setError(null);
    try {
      if (action === "details") await editProduct(userId, product.id, { name: name.trim(), description: description.trim() });
      if (action === "price") await changeProductPrice(userId, product.id, amount.trim().replace(",", "."));
      if (action === "deactivate") await deactivateProduct(userId, product.id);
      if (generation !== currentSessionGeneration()) return;
      setAction(null); setConfirming(false); setSaved(true); await onSaved();
    } catch (caught) { if (generation === currentSessionGeneration()) setError(caught); } finally { inFlight.current = false; setPending(false); }
  }
  return <article className="tournament-product">
    <h3 ref={productHeading} tabIndex={-1}>{product.name} · {formatProductPrice(product.amount, language)} {product.is_active ? "" : (en ? "· Inactive" : "· Inativo")}</h3>
    <p>{product.description}</p><p>{en ? "Offered in" : "Oferecido em"}: {product.tournaments.map(event => event.name).join(", ")}</p>
    {product.is_active && !action && <div className="tournament-product-actions"><button type="button" onClick={() => begin("details")}>{en ? "Edit details" : "Editar detalhes"}</button><button type="button" onClick={() => begin("price")}>{en ? "Change price" : "Alterar preço"}</button><button type="button" onClick={() => begin("deactivate")}>{en ? "Deactivate" : "Desativar"}</button></div>}
    {saved && <p role="status">{en ? "Product updated." : "Produto atualizado."}</p>}
    {action && !confirming && <form onSubmit={review}>
      {action === "details" && <><label>{en ? "Product name" : "Nome do produto"}<input ref={nameInput} value={name} required maxLength={255} onChange={event => setName(event.target.value)} /></label><label>{en ? "Benefits description" : "Descrição dos benefícios"}<textarea value={description} required onChange={event => setDescription(event.target.value)} /></label></>}
      {action === "price" && <label>{en ? "New price in BRL" : "Novo preço em BRL"}<input ref={priceInput} value={amount} required inputMode="decimal" onChange={event => setAmount(event.target.value)} /></label>}
      {invalid && <p role="alert">{en ? "Enter valid product details and a nonnegative BRL price with at most two decimals." : "Informe dados válidos e preço em BRL não negativo com até duas casas decimais."}</p>}
      <div className="tournament-product-actions"><button className="staff-primary-button">{en ? "Review change" : "Revisar alteração"}</button><button type="button" onClick={() => setAction(null)}>{en ? "Cancel" : "Cancelar"}</button></div>
    </form>}
    {action && confirming && <div role="region" aria-label={en ? "Confirm shared change" : "Confirmar alteração compartilhada"}>
      <h4 ref={reviewHeading} tabIndex={-1}>{en ? "Review the shared change" : "Revise a alteração compartilhada"}</h4>
      <p>{en ? "This change affects all linked tournaments:" : "Esta alteração afeta todos os torneios vinculados:"} {product.tournaments.map(event => event.name).join(", ")}.</p>
      <p>{en ? "Deactivation prevents new registrations. Existing purchases keep their agreed name, description and amount." : "A desativação impede novas inscrições. Compras anteriores mantêm o nome, a descrição e o valor acordados."}</p>
      {action === "details" && <p>{name} · {description}</p>}{action === "price" && <p>{en ? "New price" : "Novo preço"}: {amount}</p>}
      {error != null && <p role="alert">{message(error, en)}</p>}
      <div className="tournament-product-actions"><button className="staff-primary-button" type="button" disabled={pending} onClick={() => void confirm()}>{pending ? (en ? "Saving..." : "Salvando...") : (en ? "Confirm change" : "Confirmar alteração")}</button><button type="button" disabled={pending} onClick={() => { if (action === "deactivate") setAction(null); else setConfirming(false); setError(null); }}>{en ? "Cancel" : "Cancelar"}</button></div>
    </div>}
  </article>;
}
