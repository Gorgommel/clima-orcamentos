"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ClipboardCheck, History, Plus, ReceiptText, Save, Snowflake, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ServiceType = "installation" | "corrective" | "preventive";
type QuoteSummary = { id: string; customer_name: string; service_type: ServiceType; total: number; created_at: string };

const capacities = [
  { label: "9.000", price: 700 },
  { label: "12.000", price: 900 },
  { label: "18.000", price: 1200 },
];
const serviceLabels: Record<ServiceType, string> = { installation: "Instalação", corrective: "Corretiva", preventive: "Preventiva" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Home() {
  const [view, setView] = useState<"new" | "history">("new");
  const [type, setType] = useState<ServiceType>("installation");
  const [capacity, setCapacity] = useState(capacities[1]);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState(0);
  const [labor, setLabor] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [history, setHistory] = useState<QuoteSummary[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => (type === "installation" ? capacity.price : basePrice) + materials + labor, [type, capacity, basePrice, materials, labor]);

  useEffect(() => {
    if (view === "history") fetch("/api/quotes").then((response) => response.json()).then((data) => setHistory(data.quotes ?? [])).catch(() => setStatus("Não foi possível carregar o histórico."));
  }, [view]);

  async function saveQuote(event: FormEvent) {
    event.preventDefault();
    if (!customer.trim()) { setStatus("Informe o nome do cliente."); return; }
    setSaving(true); setStatus("");
    try {
      const photoKeys: string[] = [];
      for (const photo of photos) {
        const form = new FormData(); form.append("file", photo);
        const uploaded = await fetch("/api/uploads", { method: "POST", body: form }).then((response) => response.json());
        if (uploaded.key) photoKeys.push(uploaded.key);
      }
      const response = await fetch("/api/quotes", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer, phone, address, type, capacity: capacity.label, brand, model, description, materials, labor, basePrice: type === "installation" ? capacity.price : basePrice, reason, total, photos: photoKeys }),
      });
      if (!response.ok) throw new Error("save failed");
      setStatus("Orçamento salvo com sucesso.");
    } catch { setStatus("Não foi possível salvar agora. Tente novamente."); }
    finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Snowflake className="h-5 w-5" /></span><div><p className="text-sm font-black">Clima Orçamentos</p><p className="text-[11px] text-muted-foreground">Orçamento técnico no celular</p></div></div>
          <Button variant="ghost" size="sm" onClick={() => setView(view === "new" ? "history" : "new")}>{view === "new" ? <><History /> Histórico</> : <><Plus /> Novo</>}</Button>
        </div>
      </header>

      {view === "history" ? <HistoryView quotes={history} /> : (
        <form onSubmit={saveQuote} className="mx-auto max-w-2xl space-y-5 px-4 py-5">
          <div className="grid grid-cols-3 gap-2">
            <ServiceButton active={type === "installation"} icon={<Snowflake />} label="Instalação" onClick={() => setType("installation")} />
            <ServiceButton active={type === "corrective"} icon={<Wrench />} label="Corretiva" onClick={() => setType("corrective")} />
            <ServiceButton active={type === "preventive"} icon={<ClipboardCheck />} label="Preventiva" onClick={() => setType("preventive")} />
          </div>

          <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-cyan-950/10">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">{serviceLabels[type]}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{money.format(total)}</h1><p className="mt-1 text-sm text-cyan-100">{type === "installation" ? "Kit padrão de até 3 metros incluso" : "Materiais e mão de obra detalhados"}</p></div><ReceiptText className="h-8 w-8 text-cyan-200" /></div>
          </section>

          <section className="card-section">
            <SectionTitle step="1" title="Cliente e local" subtitle="Quem receberá o orçamento?" />
            <div className="grid gap-3 sm:grid-cols-2"><Input value={customer} onChange={(e) => setCustomer(e.target.value)} aria-label="Nome do cliente" placeholder="Nome do cliente" /><Input value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Telefone" inputMode="tel" placeholder="WhatsApp" /><Input value={address} onChange={(e) => setAddress(e.target.value)} className="sm:col-span-2" aria-label="Endereço" placeholder="Endereço do serviço" /></div>
          </section>

          <section className="card-section">
            <SectionTitle step="2" title="Equipamento" subtitle="Identificação do aparelho" />
            {type === "installation" && <div className="mb-3 grid grid-cols-3 gap-2">{capacities.map((item) => <button key={item.label} type="button" onClick={() => setCapacity(item)} className={`capacity ${capacity.label === item.label ? "capacity-active" : ""}`}><strong>{item.label}</strong><span>BTUs</span><small>{money.format(item.price)}</small></button>)}</div>}
            <div className="grid gap-3 sm:grid-cols-2"><Input value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Marca" placeholder="Marca (ex.: LG, Samsung)" /><Input value={model} onChange={(e) => setModel(e.target.value)} aria-label="Modelo" placeholder="Modelo ou número de série" /></div>
          </section>

          <section className="card-section">
            <SectionTitle step="3" title={type === "corrective" ? "Diagnóstico" : type === "preventive" ? "Checklist da preventiva" : "Detalhes da instalação"} subtitle={type === "installation" ? "Informe metragem e condição do local" : "Descreva o serviço com clareza"} />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" placeholder={type === "corrective" ? "Defeito relatado, diagnóstico e solução proposta..." : type === "preventive" ? "Limpeza, filtros, dreno, elétrica, pressão, testes..." : "Metragem real, suporte, dreno, acesso e observações..."} />
          </section>

          <section className="card-section">
            <SectionTitle step="4" title="Fotos" subtitle="Registre equipamento, problema e acesso" />
            <label className="photo-drop"><Camera className="h-6 w-6" /><span>{photos.length ? `${photos.length} foto(s) selecionada(s)` : "Tirar ou adicionar fotos"}</span><input className="sr-only" type="file" accept="image/*" capture="environment" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} /></label>
          </section>

          <section className="card-section">
            <SectionTitle step="5" title="Valores" subtitle="Separe materiais e mão de obra" />
            <div className="space-y-3">
              {type !== "installation" && <MoneyRow label="Serviço base" value={basePrice} onChange={setBasePrice} />}
              <MoneyRow label="Materiais / peças" value={materials} onChange={setMaterials} />
              <MoneyRow label="Mão de obra extra" value={labor} onChange={setLabor} />
              <Input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Justificativa dos adicionais" placeholder="Fornecedor, frete, altura, acesso ou outro motivo" />
            </div>
          </section>

          {status && <p className={`rounded-2xl p-3 text-center text-sm font-semibold ${status.includes("sucesso") ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{status}</p>}

          <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 backdrop-blur"><div className="mx-auto flex max-w-2xl items-center gap-4"><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Total estimado</p><p className="text-xl font-black">{money.format(total)}</p></div><Button type="submit" disabled={saving} size="lg" className="h-12 rounded-2xl px-6 font-bold"><Save /> {saving ? "Salvando..." : "Salvar orçamento"}</Button></div></footer>
        </form>
      )}
    </main>
  );
}

function SectionTitle({ step, title, subtitle }: { step: string; title: string; subtitle: string }) { return <div className="section-heading"><span className="step">{step}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>; }
function ServiceButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`service-button ${active ? "service-active" : ""}`}>{icon}<span>{label}</span></button>; }
function MoneyRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="money-row"><span>{label}</span><Input aria-label={`Valor de ${label}`} type="number" inputMode="decimal" min="0" value={value || ""} placeholder="R$ 0,00" onChange={(e) => onChange(Number(e.target.value))} /></label>; }
function HistoryView({ quotes }: { quotes: QuoteSummary[] }) { return <div className="mx-auto max-w-2xl space-y-4 px-4 py-5"><div><h1 className="text-2xl font-black">Orçamentos salvos</h1><p className="text-sm text-muted-foreground">Histórico dos atendimentos</p></div>{quotes.length === 0 ? <div className="card-section py-12 text-center"><History className="mx-auto mb-3 text-muted-foreground" /><p className="font-bold">Nenhum orçamento salvo</p><p className="text-sm text-muted-foreground">Os próximos aparecerão aqui.</p></div> : quotes.map((quote) => <article key={quote.id} className="card-section flex items-center justify-between gap-3"><div><p className="font-bold">{quote.customer_name}</p><p className="text-xs text-muted-foreground">{serviceLabels[quote.service_type]} · {new Date(quote.created_at).toLocaleDateString("pt-BR")}</p></div><div className="text-right"><p className="font-black text-primary">{money.format(quote.total)}</p><CheckCircle2 className="ml-auto mt-1 h-4 w-4 text-emerald-600" /></div></article>)}</div>; }
