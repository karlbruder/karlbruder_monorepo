import { useEffect, useRef, useState } from "react";
import { formatProductPrice, type OfferingSelection, type StaffProduct } from "@/features/tournament/api/staff-products";
import type { AppLanguage } from "@/utils/app-copy";

type Props = { products: StaffProduct[]; selection: OfferingSelection; onChange: (selection: OfferingSelection) => void; language: AppLanguage; excludeIds?: number[] };
export function TournamentProductSelection({ products, selection, onChange, language, excludeIds = [] }: Props) {
  const [search, setSearch] = useState("");
  const lastName = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const previousCount = useRef(selection.new_products.length);
  useEffect(() => {
    if (selection.new_products.length > previousCount.current) lastName.current?.focus();
    if (selection.new_products.length < previousCount.current) addButton.current?.focus();
    previousCount.current = selection.new_products.length;
  }, [selection.new_products.length]);
  const en = language === "en";
  const options = products.filter(product => (product.is_active || selection.existing_product_ids.includes(product.id)) && !excludeIds.includes(product.id) && product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div className="tournament-product-selection">
    <h3>{en ? "Registration products" : "Produtos de inscrição"}</h3>
    <p>{en ? "Select existing products or add new ones." : "Selecione produtos existentes ou adicione novos produtos."}</p>
    <label>{en ? "Search products" : "Buscar produtos"}<input value={search} onChange={event => setSearch(event.target.value)} /></label>
    {options.length === 0 && <p>{en ? "No available products found." : "Nenhum produto disponível encontrado."}</p>}
    {options.map(product => <label className="review-check" key={product.id}>
      <input type="checkbox" checked={selection.existing_product_ids.includes(product.id)} onChange={event => onChange({ ...selection, existing_product_ids: event.target.checked ? [...selection.existing_product_ids, product.id] : selection.existing_product_ids.filter(id => id !== product.id) })} />
      <span><strong>{product.name}</strong> · {formatProductPrice(product.amount, language)} {!product.is_active && (en ? "· No longer available" : "· Não está mais disponível")}<br />{product.description}<br /><small>{en ? "Offered in" : "Oferecido em"}: {product.tournaments.map(item => item.name).join(", ") || (en ? "no tournaments" : "nenhum torneio")}</small></span>
    </label>)}
    {selection.existing_product_ids.filter(id => !products.some(product => product.id === id)).map(id => <label className="review-check" key={`missing-${id}`}>
      <input type="checkbox" checked onChange={() => onChange({ ...selection, existing_product_ids: selection.existing_product_ids.filter(item => item !== id) })} />
      {en ? `Unavailable product (${id}). Uncheck to remove.` : `Produto indisponível (${id}). Desmarque para remover.`}
    </label>)}
    {selection.new_products.map((draft, index) => <fieldset key={index}>
      <legend>{en ? `New product ${index + 1}` : `Novo produto ${index + 1}`}</legend>
      <label>{en ? "Product name" : "Nome do produto"}<input ref={index === selection.new_products.length - 1 ? lastName : undefined} required maxLength={255} value={draft.name} onChange={event => update(index, "name", event.target.value)} /></label>
      <label>{en ? "Benefits description" : "Descrição dos benefícios"}<textarea required value={draft.description} onChange={event => update(index, "description", event.target.value)} /></label>
      <label>{en ? "Price in BRL" : "Preço em BRL"}<input required inputMode="decimal" value={draft.amount} onChange={event => update(index, "amount", event.target.value)} /></label>
      <button className="review-reject" type="button" onClick={() => onChange({ ...selection, new_products: selection.new_products.filter((_, i) => i !== index) })}>{en ? "Remove product" : "Remover produto"}</button>
    </fieldset>)}
    <button ref={addButton} type="button" onClick={() => onChange({ ...selection, new_products: [...selection.new_products, { name: "", description: "", amount: "" }] })}>{en ? "Add new product" : "Adicionar novo produto"}</button>
  </div>;
  function update(index: number, key: "name" | "description" | "amount", value: string) {
    onChange({ ...selection, new_products: selection.new_products.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  }
}
