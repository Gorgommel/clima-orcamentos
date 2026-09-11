"use client";

import { useMemo, useState } from "react";
import { Copy, FileDown, History, Plus, ReceiptText, Save, Snowflake, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadQuotePdf, QuoteDocument, QuoteItem, quoteItemTotal } from "@/lib/quote-pdf";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => crypto.randomUUID();
const today = new Date().toISOString().slice(0, 10);
const standardInstallations = [
  { capacity: "9000" as const, label: "9.000", price: 650 },
  { capacity: "12000" as const, label: "12.000", price: 750 },
  { capacity: "18000" as const, label: "18.000", price: 850 },
  { capacity: "22000" as const, label: "22.000", price: 1000 },
];
const extraPresets = [
  { description: "Tubulação de cobre e isolamento térmico excedente", unit: "m" },
  { description: "Cabo PP 4 vias de comunicação excedente", unit: "m" },
  { description: "Mangueira de dreno (não inclusa no padrão)", unit: "m" },
  { description: "Acesso especial, altura ou infraestrutura fora do padrão", unit: "serviço" },
];
const discountPresets = [
  "Tubulação de cobre e isolamento fornecidos pelo cliente",
  "Cabo PP 4 vias fornecido pelo cliente",
  "Suporte da unidade interna fornecido pelo cliente",
  "Suporte da unidade externa fornecido pelo cliente",
];
const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);
const personName = (value: string) => value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, "").slice(0, 80);
const quoteCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 30);
type LegacyPayload = { customer?: string; phone?: string; address?: string; type?: string; capacity?: string; brand?: string; model?: string; description?: string; materials?: number; labor?: number; basePrice?: number; reason?: string };
type StoredQuote = { id: string; customer_name: string; total: number; created_at: string; payload: LegacyPayload & { quote?: QuoteDocument } };

function quoteFromStored(stored: StoredQuote): QuoteDocument {
  if (stored.payload.quote) return stored.payload.quote;
  const p = stored.payload;
  const items = [
    { description: p.description || "Serviço de climatização", quantity: 1, unit: "serviço", unitPrice: Number(p.basePrice || 0) },
    { description: "Materiais / peças", quantity: 1, unit: "item", unitPrice: Number(p.materials || 0) },
    { description: "Mão de obra extra", quantity: 1, unit: "serviço", unitPrice: Number(p.labor || 0) },
  ].filter((item, index) => index === 0 || item.unitPrice > 0).map((item) => ({ ...item, id: uid() }));
  if (!items.some((item) => item.unitPrice > 0) && stored.total > 0) items[0].unitPrice = stored.total;
  return { number: `LEG-${stored.id.slice(0, 8).toUpperCase()}`, issueDate: stored.created_at.slice(0, 10), validUntil: "", customer: { name: p.customer || stored.customer_name, document: "", phone: p.phone || "", email: "", address: p.address || "" }, provider: { name: "Clima Serviços", document: "", phone: "", email: "" }, serviceType: p.type === "corrective" ? "Manutenção corretiva" : p.type === "preventive" ? "Manutenção preventiva" : "Instalação de ar-condicionado", equipment: [p.brand, p.model, p.capacity && `${p.capacity} BTU/h`].filter(Boolean).join(" · "), items, paymentTerms: "Não informado no registro original.", executionTerms: "Não informado no registro original.", included: p.description || "", exclusions: "", notes: p.reason || "" };
}

function freshQuote(): QuoteDocument {
  return {
    number: `CO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, issueDate: today,
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    customer: { name: "", document: "", phone: "", email: "", address: "" },
    provider: { name: "Clima Serviços", document: "", phone: "", email: "" },
    serviceType: "Instalação de ar-condicionado", equipment: "Split Hi-Wall · 12.000 BTU/h · Parede com parede (até 3 m)",
    installationCapacity: "12000", installationLayout: "wall-to-wall",
    items: [{ id: uid(), kind: "charge", description: "Instalação padrão 12.000 BTU/h — parede com parede, com até 3 m de tubulação", quantity: 1, unit: "serviço", unitPrice: 750 }],
    paymentTerms: "50% na aprovação e 50% após a conclusão do serviço.",
    executionTerms: "Agendamento em até 5 dias úteis após a aprovação, sujeito à disponibilidade.",
    included: "Tubulação de cobre e isolamento térmico até 3 metros\nCabo PP 4 vias para comunicação entre as unidades até 3 metros\nSuporte para a unidade interna e para a unidade externa\nFixação, vácuo, testes e orientação de uso",
    exclusions: "Mangueira ou extensão de dreno (cobrada à parte)\nTubulação de cobre, isolamento térmico e cabo PP 4 vias acima de 3 metros\nPonto elétrico, disjuntor e adequações na rede elétrica\nCortes, rasgos, pintura, gesso, marcenaria ou acabamento civil\nAndaimes, plataformas ou acesso especial\nDesinstalação e descarte de equipamento existente\nServiços ou materiais além dos limites descritos nos itens",
    notes: "Valores consideram acesso livre e condições normais de instalação. Qualquer serviço adicional será informado e aprovado antes da execução.",
  };
}

export default function Home() {
  const [quote, setQuote] = useState(freshQuote); const [status, setStatus] = useState(""); const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"edit" | "history">("edit"); const [history, setHistory] = useState<StoredQuote[]>([]); const [selected, setSelected] = useState<StoredQuote | null>(null);
  const total = useMemo(() => quote.items.reduce((sum, item) => sum + quoteItemTotal(item), 0), [quote.items]);
  const update = <K extends keyof QuoteDocument>(key: K, value: QuoteDocument[K]) => setQuote((current) => ({ ...current, [key]: value }));
  const updateParty = (party: "customer" | "provider", key: string, value: string) => setQuote((current) => ({ ...current, [party]: { ...current[party], [key]: value } }));
  const updateItem = (id: string, patch: Partial<QuoteItem>) => update("items", quote.items.map((item) => item.id === id ? { ...item, ...patch } : item));
  function applyStandardInstallation(capacity: QuoteDocument["installationCapacity"]) {
    const option = standardInstallations.find((entry) => entry.capacity === capacity) ?? standardInstallations[1];
    setQuote((current) => {
      const layout = current.installationLayout ?? "wall-to-wall";
      const standardItem: QuoteItem = { id: current.items[0]?.id ?? uid(), kind: "charge", description: `Instalação padrão ${option.label} BTU/h — parede com parede, com até 3 m de tubulação`, quantity: 1, unit: "serviço", unitPrice: option.price };
      return { ...current, installationCapacity: option.capacity, equipment: `Split Hi-Wall · ${option.label} BTU/h · ${layout === "wall-to-wall" ? "Parede com parede (até 3 m)" : "Fora do padrão — sujeito a avaliação"}`, items: [standardItem, ...current.items.slice(1)] };
    });
  }
  function setInstallationLayout(layout: NonNullable<QuoteDocument["installationLayout"]>) {
    setQuote((current) => {
      const option = standardInstallations.find((entry) => entry.capacity === current.installationCapacity) ?? standardInstallations[1];
      return { ...current, installationLayout: layout, equipment: `Split Hi-Wall · ${option.label} BTU/h · ${layout === "wall-to-wall" ? "Parede com parede (até 3 m)" : "Fora do padrão — sujeito a avaliação"}` };
    });
  }
  function addPreset(description: string, unit: string, kind: "charge" | "discount" = "charge") {
    if (quote.items.some((item) => item.description === description && item.kind === kind)) return setStatus("Este item já foi adicionado. Ajuste a quantidade ou o valor na linha existente.");
    update("items", [...quote.items, { id: uid(), description, quantity: 1, unit, unitPrice: 0, kind }]);
    setStatus(kind === "discount" ? "Desconto adicionado. Informe o valor do material fornecido pelo cliente." : "Adicional inserido. Informe a quantidade e o valor após a avaliação.");
  }
  const validEmail = (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validDocument = (value: string) => !value || [11, 14].includes(value.length);
  const validPhone = (value: string) => value.length === 10 || value.length === 11;
  const validate = () => {
    if (!quote.number.trim()) return "Informe o número da proposta.";
    if (!quote.issueDate || !quote.validUntil || quote.validUntil < quote.issueDate) return "A validade deve ser igual ou posterior à data de emissão.";
    if (!quote.provider.name.trim()) return "Informe a empresa ou o profissional responsável.";
    if (!validDocument(quote.provider.document) || !validDocument(quote.customer.document)) return "CPF deve ter 11 dígitos e CNPJ, 14 dígitos.";
    if (quote.provider.phone && !validPhone(quote.provider.phone)) return "O telefone do prestador deve ter 10 ou 11 dígitos.";
    if (!quote.customer.name.trim()) return "Informe o nome do cliente.";
    if (!validPhone(quote.customer.phone)) return "Informe o WhatsApp do cliente com DDD e 10 ou 11 dígitos.";
    if (!validEmail(quote.provider.email) || !validEmail(quote.customer.email)) return "Confira o e-mail informado (exemplo: nome@empresa.com).";
    if (!quote.customer.address.trim()) return "Informe o endereço do serviço.";
    if (!quote.items.length || quote.items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) return "Revise descrições, quantidades e valores dos itens.";
    if (quote.items.some((item, index) => index > 0 && item.unitPrice === 0)) return "Informe o valor de cada adicional ou desconto inserido.";
    if (total < 0) return "O total não pode ficar negativo. Revise os descontos.";
    return "";
  };
  async function loadHistory() { const data = await fetch("/api/quotes").then((response) => response.json()) as { quotes?: StoredQuote[] }; setHistory(data.quotes ?? []); }
  async function openHistory() { setSelected(null); setView("history"); setStatus(""); try { await loadHistory(); } catch { setStatus("Não foi possível carregar o histórico."); } }
  async function saveQuote(event: { preventDefault(): void }) {
    event.preventDefault(); const error = validate(); if (error) { setStatus(error); return; }
    setSaving(true); setStatus("");
    try { const response = await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customer: quote.customer.name, type: "installation", total, quote }) }); if (!response.ok) throw new Error(); downloadQuotePdf(quote); await loadHistory(); setView("history"); setStatus("Orçamento salvo no histórico e PDF baixado com sucesso."); }
    catch { setStatus("Não foi possível salvar o orçamento. Nenhum registro foi perdido; tente novamente."); } finally { setSaving(false); }
  }
  function exportPdf() { const error = validate(); if (error) return setStatus(error); downloadQuotePdf(quote); setStatus("PDF profissional gerado com sucesso."); }
  function duplicate(stored: StoredQuote) { const source = quoteFromStored(stored); setQuote({ ...source, number: `CO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, items: source.items.map((item) => ({ ...item, id: uid() })) }); setSelected(null); setView("edit"); setStatus("Cópia criada. Revise os dados antes de salvar."); }

  return <main className="min-h-screen bg-background pb-28 text-foreground">
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Snowflake className="h-5 w-5" /></span><div><p className="text-sm font-black">Clima Orçamentos</p><p className="text-[11px] text-muted-foreground">Propostas profissionais no celular</p></div></div><Button type="button" variant="ghost" size="sm" onClick={view === "edit" ? openHistory : () => { setSelected(null); setView("edit"); }}>{view === "edit" ? <><History /> Histórico</> : <><Plus /> Novo</>}</Button></div></header>
    {view === "history" ? <HistoryView quotes={history} selected={selected} status={status} onSelect={setSelected} onClose={() => setSelected(null)} onDownload={(stored) => downloadQuotePdf(quoteFromStored(stored))} onDuplicate={duplicate} /> :
    <form onSubmit={saveQuote} className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <section className="hero-card"><div><p className="eyebrow">Nova proposta comercial</p><h1>{money.format(total)}</h1><p>Ao salvar, o orçamento entra no histórico e o PDF é baixado.</p></div><ReceiptText className="h-9 w-9 text-cyan-200" /></section>
      <Section step="1" title="Identificação" subtitle="Campos obrigatórios são indicados com *"><Grid><Field label="Número da proposta *"><Input required maxLength={30} value={quote.number} onChange={(e) => update("number", quoteCode(e.target.value))} placeholder="CO-2026-00001" /></Field><Field label="Data de emissão *"><Input required type="date" value={quote.issueDate} onChange={(e) => update("issueDate", e.target.value)} /></Field><Field label="Válida até *"><Input required type="date" min={quote.issueDate} value={quote.validUntil} onChange={(e) => update("validUntil", e.target.value)} /></Field><Field label="Empresa / profissional *"><Input required minLength={2} maxLength={80} value={quote.provider.name} onChange={(e) => updateParty("provider", "name", personName(e.target.value))} placeholder="Nome do responsável" /></Field><Field label="CPF / CNPJ"><Input inputMode="numeric" maxLength={14} value={quote.provider.document} onChange={(e) => updateParty("provider", "document", digits(e.target.value, 14))} placeholder="Somente números" title="Digite 11 números para CPF ou 14 para CNPJ" /></Field><Field label="Telefone"><Input type="tel" inputMode="numeric" maxLength={11} value={quote.provider.phone} onChange={(e) => updateParty("provider", "phone", digits(e.target.value, 11))} placeholder="DDD + número" /></Field><Field label="E-mail"><Input type="email" maxLength={120} value={quote.provider.email} onChange={(e) => updateParty("provider", "email", e.target.value.trim().slice(0, 120))} placeholder="nome@empresa.com" /></Field></Grid></Section>
      <Section step="2" title="Cliente e local" subtitle="Nome, WhatsApp e endereço são obrigatórios"><Grid><Field label="Nome do cliente *"><Input required minLength={2} maxLength={80} value={quote.customer.name} onChange={(e) => updateParty("customer", "name", personName(e.target.value))} placeholder="Nome completo" /></Field><Field label="CPF / CNPJ"><Input inputMode="numeric" maxLength={14} value={quote.customer.document} onChange={(e) => updateParty("customer", "document", digits(e.target.value, 14))} placeholder="Somente números" title="Digite 11 números para CPF ou 14 para CNPJ" /></Field><Field label="WhatsApp *"><Input required type="tel" inputMode="numeric" minLength={10} maxLength={11} value={quote.customer.phone} onChange={(e) => updateParty("customer", "phone", digits(e.target.value, 11))} placeholder="DDD + número" /></Field><Field label="E-mail"><Input type="email" maxLength={120} value={quote.customer.email} onChange={(e) => updateParty("customer", "email", e.target.value.trim().slice(0, 120))} placeholder="cliente@email.com" /></Field><Field label="Endereço do serviço *" wide><Input required minLength={5} maxLength={160} value={quote.customer.address} onChange={(e) => updateParty("customer", "address", e.target.value.slice(0, 160))} placeholder="Rua, número, bairro e cidade" /></Field></Grid></Section>
      <Section step="3" title="Escopo, adicionais e descontos" subtitle="Escolha opções prontas e informe somente quantidades e valores"><Grid><Field label="Tipo de serviço *"><Input required maxLength={80} value={quote.serviceType} onChange={(e) => update("serviceType", e.target.value.slice(0, 80))} /></Field><Field label="Equipamento *"><Input required maxLength={140} value={quote.equipment} onChange={(e) => update("equipment", e.target.value.slice(0, 140))} /></Field></Grid><div className="mt-4 rounded-2xl border bg-secondary/35 p-4"><div><h3 className="font-black">Instalação padrão com material incluso</h3><p className="text-xs text-muted-foreground">Parede com parede: cobre e isolamento até 3 m, cabo PP 4 vias até 3 m, suportes, fixação, vácuo, testes e orientação. Mangueira de dreno não inclusa.</p></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{standardInstallations.map((option) => <button type="button" key={option.capacity} onClick={() => applyStandardInstallation(option.capacity)} className={`rounded-xl border p-3 text-left transition ${quote.installationCapacity === option.capacity ? "border-primary bg-background ring-2 ring-primary/15" : "bg-card"}`}><strong className="block text-sm">{option.label} BTUs</strong><span className="text-sm font-black text-primary">{money.format(option.price)}</span></button>)}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><Button type="button" variant={quote.installationLayout !== "evaluation" ? "default" : "outline"} onClick={() => setInstallationLayout("wall-to-wall")}>Parede com parede</Button><Button type="button" variant={quote.installationLayout === "evaluation" ? "default" : "outline"} onClick={() => setInstallationLayout("evaluation")}>Fora do padrão — avaliar</Button></div>{quote.installationLayout === "evaluation" && <p className="mt-3 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-amber-900">Avaliação obrigatória: confira distância, dreno, acesso, altura e infraestrutura. Depois selecione os adicionais abaixo e informe os valores aprovados.</p>}</div>
      <PresetGroup title="Cobranças adicionais" hint="Selecione o que foi identificado na avaliação.">{extraPresets.map((preset) => <button type="button" key={preset.description} className="preset-button" onClick={() => addPreset(preset.description, preset.unit)}><Plus />{preset.description}</button>)}</PresetGroup>
      <PresetGroup title="Desconto por material do cliente" hint="O desconto aparece separado e reduz o total.">{discountPresets.map((description) => <button type="button" key={description} className="preset-button preset-discount" onClick={() => addPreset(description, "item", "discount")}><Plus />{description}</button>)}</PresetGroup>
      <div className="mt-4 space-y-3">{quote.items.map((item, index) => <article className={`item-card ${item.kind === "discount" ? "item-discount" : ""}`} key={item.id}><div className="item-title"><strong>{item.kind === "discount" ? "Desconto" : `Item ${index + 1}`}</strong>{index > 0 && <Button type="button" variant="ghost" size="icon-sm" aria-label="Remover item" onClick={() => update("items", quote.items.filter((entry) => entry.id !== item.id))}><Trash2 /></Button>}</div><Field label="Descrição *"><Input required maxLength={160} value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value.slice(0, 160) })} placeholder="Descreva o serviço ou material" /></Field><div className="item-values"><Field label="Quantidade *"><Input required type="number" min="0.01" max="999" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Math.max(0, Number(e.target.value)) })} /></Field><Field label="Unidade *"><select required className="h-9 rounded-md border bg-transparent px-3 text-sm text-foreground" value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })}><option value="serviço">serviço</option><option value="item">item</option><option value="m">metro</option><option value="un">unidade</option><option value="kit">kit</option></select></Field><Field label={item.kind === "discount" ? "Valor do desconto *" : "Valor unitário *"}><Input required type="number" inputMode="decimal" min={index === 0 ? "0" : "0.01"} max="999999" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value)) })} /></Field></div><p className="item-subtotal">{item.kind === "discount" ? "Redução" : "Subtotal"} <strong>{money.format(quoteItemTotal(item))}</strong></p></article>)}</div><Button type="button" variant="outline" className="mt-3 w-full" onClick={() => addPreset("Cobrança adicional avaliada", "serviço")}><Plus /> Outro adicional</Button></Section>
      <Section step="4" title="Condições comerciais" subtitle="Pagamento, execução e observações"><Stack><Field label="Condições de pagamento"><Textarea value={quote.paymentTerms} onChange={(e) => update("paymentTerms", e.target.value)} /></Field><Field label="Prazo e condições de execução"><Textarea value={quote.executionTerms} onChange={(e) => update("executionTerms", e.target.value)} /></Field><Field label="Observações"><Textarea value={quote.notes} onChange={(e) => update("notes", e.target.value)} /></Field></Stack></Section>
      <Section step="5" title="Escopo detalhado" subtitle="Use uma linha para cada item"><Stack><Field label="Itens inclusos"><Textarea className="min-h-40" value={quote.included} onChange={(e) => update("included", e.target.value)} /></Field><Field label="Não inclusos / exclusões"><Textarea className="min-h-40" value={quote.exclusions} onChange={(e) => update("exclusions", e.target.value)} /></Field></Stack></Section>
      {status && <p className={`status ${status.includes("sucesso") || status.includes("criada") ? "status-ok" : "status-warn"}`}>{status}</p>}
      <footer className="action-bar"><div className="mx-auto flex max-w-3xl items-center gap-3"><div className="min-w-0 flex-1"><p>Total da proposta</p><strong>{money.format(total)}</strong></div><Button type="button" onClick={exportPdf} variant="outline" className="h-12 rounded-2xl"><FileDown /><span className="hidden sm:inline">Só PDF</span></Button><Button type="submit" disabled={saving} className="h-12 rounded-2xl px-5 font-bold"><Save />{saving ? "Salvando..." : "Salvar + PDF"}</Button></div></footer>
    </form>}
  </main>;
}

function Section({ step, title, subtitle, children }: { step: string; title: string; subtitle: string; children: React.ReactNode }) { return <section className="card-section"><div className="section-heading"><span className="step">{step}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>; }
function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={`field-label ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span>{children}</label>; }
function Grid({ children }: { children: React.ReactNode }) { return <div className="form-grid">{children}</div>; }
function Stack({ children }: { children: React.ReactNode }) { return <div className="space-y-4">{children}</div>; }
function PresetGroup({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) { return <div className="preset-group"><h3>{title}</h3><p>{hint}</p><div>{children}</div></div>; }

function HistoryView({ quotes, selected, status, onSelect, onClose, onDownload, onDuplicate }: { quotes: StoredQuote[]; selected: StoredQuote | null; status: string; onSelect: (quote: StoredQuote) => void; onClose: () => void; onDownload: (quote: StoredQuote) => void; onDuplicate: (quote: StoredQuote) => void }) {
  if (selected) return <QuoteDetails stored={selected} onClose={onClose} onDownload={onDownload} onDuplicate={onDuplicate} />;
  return <section className="mx-auto max-w-3xl space-y-4 px-4 py-5"><div><h1 className="text-2xl font-black">Orçamentos salvos</h1><p className="text-sm text-muted-foreground">Toque em um registro para consultar todos os dados.</p></div>{status && <p className="status status-ok">{status}</p>}{quotes.length === 0 ? <div className="card-section py-12 text-center"><History className="mx-auto mb-3 text-muted-foreground" /><p className="font-bold">Nenhum orçamento salvo</p></div> : quotes.map((stored) => <button type="button" key={stored.id} onClick={() => onSelect(stored)} className="history-card"><div><strong>{stored.customer_name}</strong><span>{stored.payload.quote?.number ?? "Registro antigo"} · {new Date(stored.created_at).toLocaleDateString("pt-BR")}</span></div><b>{money.format(stored.total)}</b></button>)}</section>;
}

function QuoteDetails({ stored, onClose, onDownload, onDuplicate }: { stored: StoredQuote; onClose: () => void; onDownload: (quote: StoredQuote) => void; onDuplicate: (quote: StoredQuote) => void }) {
  const detail = quoteFromStored(stored);
  const total = detail.items.reduce((sum, item) => sum + quoteItemTotal(item), 0);
  return <section className="mx-auto max-w-3xl space-y-4 px-4 py-5"><div className="flex items-start justify-between"><div><p className="eyebrow text-primary">Detalhes do orçamento</p><h1 className="text-2xl font-black">{detail.customer.name}</h1><p className="text-sm text-muted-foreground">{detail.number} · {detail.issueDate}</p></div><Button variant="ghost" size="icon" onClick={onClose}><X /></Button></div><div className="detail-total"><span>Valor total</span><strong>{money.format(total)}</strong></div><Detail label="Cliente" value={[detail.customer.document, detail.customer.phone, detail.customer.email, detail.customer.address].filter(Boolean).join(" · ")} /><Detail label="Serviço" value={`${detail.serviceType} · ${detail.equipment}`} /><section className="card-section"><h2 className="mb-3 font-black">Itens</h2>{detail.items.map((item) => <div key={item.id} className="detail-item"><div><strong>{item.kind === "discount" ? `Desconto — ${item.description}` : item.description}</strong><span>{item.quantity} {item.unit} × {money.format(item.kind === "discount" ? -item.unitPrice : item.unitPrice)}</span></div><b>{money.format(quoteItemTotal(item))}</b></div>)}</section><Detail label="Pagamento" value={detail.paymentTerms} /><Detail label="Prazo / execução" value={detail.executionTerms} /><Detail label="Itens inclusos" value={detail.included} pre /><Detail label="Não inclusos / exclusões" value={detail.exclusions} pre /><Detail label="Observações" value={detail.notes} /><div className="grid gap-3 sm:grid-cols-2"><Button className="h-12 rounded-2xl" onClick={() => onDownload(stored)}><FileDown /> Baixar PDF novamente</Button><Button variant="outline" className="h-12 rounded-2xl" onClick={() => onDuplicate(stored)}><Copy /> Duplicar e editar</Button></div></section>;
}
function Detail({ label, value, pre }: { label: string; value: string; pre?: boolean }) { return <section className="card-section"><h2 className="text-xs font-black uppercase tracking-wider text-primary">{label}</h2><p className={`mt-2 text-sm ${pre ? "whitespace-pre-line" : ""}`}>{value || "Não informado"}</p></section>; }
