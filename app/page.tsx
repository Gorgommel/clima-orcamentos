"use client";

import { useMemo, useState } from "react";
import { FileDown, Plus, ReceiptText, Save, Snowflake, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadQuotePdf, QuoteDocument, QuoteItem } from "@/lib/quote-pdf";

const today = new Date().toISOString().slice(0, 10);
const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => crypto.randomUUID();
const initialItems: QuoteItem[] = [
  { id: uid(), description: "Instalação de ar-condicionado split até 12.000 BTU/h", quantity: 1, unit: "un", unitPrice: 900 },
  { id: uid(), description: "Kit de materiais para instalação até 3 metros", quantity: 1, unit: "kit", unitPrice: 350 },
];
const initialQuote: QuoteDocument = {
  number: `CO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, issueDate: today, validUntil,
  customer: { name: "", document: "", phone: "", email: "", address: "" },
  provider: { name: "Clima Serviços", document: "", phone: "", email: "" },
  serviceType: "Instalação de ar-condicionado", equipment: "Split Hi-Wall", items: initialItems,
  paymentTerms: "50% na aprovação e 50% após a conclusão do serviço.",
  executionTerms: "Agendamento em até 5 dias úteis após a aprovação, sujeito à disponibilidade.",
  included: "Tubulação de cobre e isolamento térmico até 3 metros\nCabo de interligação entre as unidades até 3 metros\nSuporte para a unidade externa\nMangueira de dreno até 3 metros\nFixação, vácuo, testes e orientação de uso",
  exclusions: "Ponto elétrico, disjuntor e adequações na rede elétrica\nCortes, rasgos, pintura, gesso, marcenaria ou acabamento civil\nAndaimes, plataformas ou acesso especial\nDesinstalação e descarte de equipamento existente\nServiços ou materiais além dos limites descritos nos itens",
  notes: "Valores consideram acesso livre e condições normais de instalação. Qualquer serviço adicional será informado e aprovado antes da execução.",
};

export default function Home() {
  const [quote, setQuote] = useState(initialQuote); const [status, setStatus] = useState(""); const [saving, setSaving] = useState(false);
  const total = useMemo(() => quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [quote.items]);
  const update = <K extends keyof QuoteDocument>(key: K, value: QuoteDocument[K]) => setQuote((current) => ({ ...current, [key]: value }));
  const updateCustomer = (key: keyof QuoteDocument["customer"], value: string) => setQuote((current) => ({ ...current, customer: { ...current.customer, [key]: value } }));
  const updateProvider = (key: keyof QuoteDocument["provider"], value: string) => setQuote((current) => ({ ...current, provider: { ...current.provider, [key]: value } }));
  const updateItem = (id: string, patch: Partial<QuoteItem>) => update("items", quote.items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const validate = () => !quote.customer.name.trim() ? "Informe o nome do cliente." : (!quote.items.length || quote.items.some((item) => !item.description.trim() || item.quantity <= 0)) ? "Revise os itens e suas quantidades." : "";
  async function saveQuote(event: { preventDefault(): void }) {
    event.preventDefault(); const error = validate(); if (error) { setStatus(error); return; } setSaving(true); setStatus("");
    try { const response = await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customer: quote.customer.name, type: "installation", total, quote }) }); if (!response.ok) throw new Error(); setStatus("Orçamento salvo com sucesso."); }
    catch { setStatus("Não foi possível salvar agora. Você ainda pode gerar o PDF."); } finally { setSaving(false); }
  }
  function exportPdf() { const error = validate(); if (error) { setStatus(error); return; } downloadQuotePdf(quote); setStatus("PDF profissional gerado com sucesso."); }
  return <main className="min-h-screen bg-background pb-28 text-foreground">
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Snowflake className="h-5 w-5" /></span><div><p className="text-sm font-black">Clima Orçamentos</p><p className="text-[11px] text-muted-foreground">Propostas profissionais no celular</p></div></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{quote.number}</span></div></header>
    <form onSubmit={saveQuote} className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <section className="hero-card"><div><p className="eyebrow">Nova proposta comercial</p><h1>{money.format(total)}</h1><p>Preencha, revise e gere um PDF pronto para enviar ao cliente.</p></div><ReceiptText className="h-9 w-9 text-cyan-200" /></section>
      <Section step="1" title="Identificação" subtitle="Número, datas e dados de quem presta o serviço"><div className="form-grid"><Field label="Número da proposta"><Input value={quote.number} onChange={(e) => update("number", e.target.value)} /></Field><Field label="Data de emissão"><Input type="date" value={quote.issueDate} onChange={(e) => update("issueDate", e.target.value)} /></Field><Field label="Válida até"><Input type="date" value={quote.validUntil} onChange={(e) => update("validUntil", e.target.value)} /></Field><Field label="Empresa / profissional"><Input value={quote.provider.name} onChange={(e) => updateProvider("name", e.target.value)} /></Field><Field label="CPF / CNPJ"><Input value={quote.provider.document} onChange={(e) => updateProvider("document", e.target.value)} /></Field><Field label="Telefone"><Input value={quote.provider.phone} onChange={(e) => updateProvider("phone", e.target.value)} /></Field><Field label="E-mail"><Input value={quote.provider.email} onChange={(e) => updateProvider("email", e.target.value)} /></Field></div></Section>
      <Section step="2" title="Cliente e local" subtitle="Dados exibidos no cabeçalho do orçamento"><div className="form-grid"><Field label="Nome do cliente"><Input value={quote.customer.name} onChange={(e) => updateCustomer("name", e.target.value)} placeholder="Nome ou razão social" /></Field><Field label="CPF / CNPJ"><Input value={quote.customer.document} onChange={(e) => updateCustomer("document", e.target.value)} /></Field><Field label="WhatsApp"><Input value={quote.customer.phone} onChange={(e) => updateCustomer("phone", e.target.value)} /></Field><Field label="E-mail"><Input value={quote.customer.email} onChange={(e) => updateCustomer("email", e.target.value)} /></Field><Field label="Endereço do serviço" wide><Input value={quote.customer.address} onChange={(e) => updateCustomer("address", e.target.value)} placeholder="Rua, número, bairro, cidade e UF" /></Field></div></Section>
      <Section step="3" title="Escopo e itens" subtitle="Quantidades, valores unitários e subtotais"><div className="form-grid mb-4"><Field label="Tipo de serviço"><Input value={quote.serviceType} onChange={(e) => update("serviceType", e.target.value)} /></Field><Field label="Equipamento"><Input value={quote.equipment} onChange={(e) => update("equipment", e.target.value)} /></Field></div><div className="space-y-3">{quote.items.map((item, index) => <article className="item-card" key={item.id}><div className="item-title"><strong>Item {index + 1}</strong><Button type="button" variant="ghost" size="icon-sm" aria-label="Excluir item" onClick={() => update("items", quote.items.filter((entry) => entry.id !== item.id))}><Trash2 /></Button></div><Field label="Descrição"><Input value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} /></Field><div className="item-values"><Field label="Quantidade"><Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} /></Field><Field label="Unidade"><Input value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })} /></Field><Field label="Valor unitário"><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} /></Field></div><p className="item-subtotal">Subtotal <strong>{money.format(item.quantity * item.unitPrice)}</strong></p></article>)}</div><Button type="button" variant="outline" className="mt-3 w-full" onClick={() => update("items", [...quote.items, { id: uid(), description: "", quantity: 1, unit: "un", unitPrice: 0 }])}><Plus /> Adicionar item</Button></Section>
      <Section step="4" title="Condições comerciais" subtitle="Pagamento, execução e observações"><div className="space-y-4"><Field label="Condições de pagamento"><Textarea value={quote.paymentTerms} onChange={(e) => update("paymentTerms", e.target.value)} /></Field><Field label="Prazo e condições de execução"><Textarea value={quote.executionTerms} onChange={(e) => update("executionTerms", e.target.value)} /></Field><Field label="Observações"><Textarea value={quote.notes} onChange={(e) => update("notes", e.target.value)} /></Field></div></Section>
      <Section step="5" title="Escopo detalhado" subtitle="Use uma linha para cada item"><div className="space-y-4"><Field label="Itens inclusos"><Textarea className="min-h-40" value={quote.included} onChange={(e) => update("included", e.target.value)} /></Field><Field label="Não inclusos / exclusões"><Textarea className="min-h-40" value={quote.exclusions} onChange={(e) => update("exclusions", e.target.value)} /></Field></div></Section>
      {status && <p className={`status ${status.includes("sucesso") || status.includes("gerado") ? "status-ok" : "status-warn"}`}>{status}</p>}
      <footer className="action-bar"><div className="mx-auto flex max-w-3xl items-center gap-3"><div className="min-w-0 flex-1"><p>Total da proposta</p><strong>{money.format(total)}</strong></div><Button type="submit" disabled={saving} variant="outline" className="h-12 rounded-2xl"><Save /><span className="hidden sm:inline">{saving ? "Salvando..." : "Salvar"}</span></Button><Button type="button" onClick={exportPdf} className="h-12 rounded-2xl px-5 font-bold"><FileDown /> Gerar PDF</Button></div></footer>
    </form>
  </main>;
}

function Section({ step, title, subtitle, children }: { step: string; title: string; subtitle: string; children: React.ReactNode }) { return <section className="card-section"><div className="section-heading"><span className="step">{step}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>; }
function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={`field-label ${wide ? "sm:col-span-2" : ""}`}><span>{label}</span>{children}</label>; }
