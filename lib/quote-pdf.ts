import * as jsPdfModule from "jspdf";
import * as autoTableModule from "jspdf-autotable";
import type { jsPDF as JsPdfType } from "jspdf";

const JsPdf = jsPdfModule.jsPDF ?? (jsPdfModule.default as unknown as { jsPDF: typeof jsPdfModule.jsPDF }).jsPDF;
const autoTable = autoTableModule.autoTable ?? autoTableModule.default;

export type QuoteItem = { id: string; description: string; quantity: number; unit: string; unitPrice: number };
export type QuoteDocument = {
  number: string; issueDate: string; validUntil: string;
  customer: { name: string; document: string; phone: string; email: string; address: string };
  provider: { name: string; document: string; phone: string; email: string };
  serviceType: string; equipment: string; items: QuoteItem[];
  paymentTerms: string; executionTerms: string; included: string; exclusions: string; notes: string;
};

const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const cleanLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

export function buildQuotePdf(quote: QuoteDocument) {
  const doc = new JsPdf({ unit: "mm", format: "a4" });
  const navy: [number, number, number] = [15, 42, 61], teal: [number, number, number] = [14, 116, 118], pale: [number, number, number] = [235, 247, 246];
  const ink: [number, number, number] = [34, 48, 58], muted: [number, number, number] = [96, 112, 121];
  const margin = 16, pageWidth = 178;
  const total = quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const footer = () => {
    doc.setDrawColor(213, 224, 226).line(margin, 284, 194, 284);
    doc.setFontSize(8).setTextColor(...muted).text(`${quote.provider.name || "Clima Orçamentos"} · Proposta ${quote.number}`, margin, 290);
    doc.text(`Página ${doc.getNumberOfPages()}`, 194, 290, { align: "right" });
  };

  doc.setFillColor(...navy).rect(0, 0, 210, 46, "F");
  doc.setFillColor(...teal).roundedRect(margin, 12, 11, 11, 2.5, 2.5, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(18).text(quote.provider.name || "Clima Orçamentos", 32, 19);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(202, 224, 226).text([quote.provider.document, quote.provider.phone, quote.provider.email].filter(Boolean).join(" · "), 32, 25);
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(255, 255, 255).text("PROPOSTA COMERCIAL", 194, 18, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(202, 224, 226).text(`Nº ${quote.number}`, 194, 25, { align: "right" });

  doc.setTextColor(...ink).setFontSize(8).setFont("helvetica", "bold").text("CLIENTE", margin, 56).text("EMISSÃO", 132, 56).text("VALIDADE", 166, 56);
  doc.setFont("helvetica", "normal").setFontSize(10).text(quote.customer.name || "Cliente não informado", margin, 63);
  doc.setFontSize(8.5).setTextColor(...muted).text([quote.customer.document, quote.customer.phone, quote.customer.email].filter(Boolean).join(" · "), margin, 68, { maxWidth: 110 });
  doc.text(quote.customer.address || "Endereço não informado", margin, 73, { maxWidth: 110 });
  doc.setTextColor(...ink).setFontSize(9).text(quote.issueDate, 132, 63).text(quote.validUntil, 166, 63);
  doc.setFillColor(...pale).roundedRect(margin, 80, pageWidth, 18, 3, 3, "F");
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...teal).text("ESCOPO DA PROPOSTA", 21, 87);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...ink).text(`${quote.serviceType}${quote.equipment ? ` · ${quote.equipment}` : ""}`, 21, 93, { maxWidth: 168 });

  autoTable(doc, {
    startY: 105, margin: { left: margin, right: margin },
    head: [["ITEM / SERVIÇO", "QTD.", "UN.", "VALOR UNIT.", "SUBTOTAL"]],
    body: quote.items.map((item) => [item.description || "Item sem descrição", item.quantity.toLocaleString("pt-BR"), item.unit, brl(item.unitPrice), brl(item.quantity * item.unitPrice)]),
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 3.2, textColor: ink, lineColor: [220, 228, 230], lineWidth: 0.15 },
    headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 7.5 }, alternateRowStyles: { fillColor: [247, 250, 250] },
    columnStyles: { 0: { cellWidth: 84 }, 1: { halign: "center", cellWidth: 16 }, 2: { halign: "center", cellWidth: 16 }, 3: { halign: "right", cellWidth: 29 }, 4: { halign: "right", cellWidth: 33, fontStyle: "bold" } },
  });
  const tableEnd = (doc as JsPdfType & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 130;
  const totalY = tableEnd + 7;
  doc.setFillColor(...navy).roundedRect(126, totalY, 68, 18, 3, 3, "F");
  doc.setTextColor(202, 224, 226).setFontSize(8).setFont("helvetica", "bold").text("VALOR TOTAL", 132, totalY + 7);
  doc.setTextColor(255, 255, 255).setFontSize(15).text(brl(total), 188, totalY + 12, { align: "right" });
  autoTable(doc, {
    startY: totalY + 27, margin: { left: margin, right: margin }, theme: "grid",
    body: [["CONDIÇÕES DE PAGAMENTO", quote.paymentTerms || "A combinar"], ["PRAZO / EXECUÇÃO", quote.executionTerms || "A combinar"], ["OBSERVAÇÕES", quote.notes || "Sem observações adicionais"]],
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 3, lineColor: [213, 224, 226], lineWidth: 0.2, textColor: ink },
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold", fillColor: pale, textColor: teal } },
  });
  footer();

  doc.addPage(); doc.setFillColor(...navy).rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(16).text("Escopo e condições do serviço", margin, 18);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(202, 224, 226).text(`Proposta ${quote.number} · ${quote.customer.name}`, margin, 24);
  const section = (title: string, content: string, startY: number, accent: readonly [number, number, number]) => {
    doc.setFillColor(...accent).roundedRect(margin, startY, pageWidth, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(9).text(title, 20, startY + 6.5);
    doc.setTextColor(...ink).setFont("helvetica", "normal").setFontSize(9); let y = startY + 17;
    (cleanLines(content).length ? cleanLines(content) : ["Nenhum item informado."]).forEach((entry) => {
      const wrapped = doc.splitTextToSize(entry.replace(/^[-•]\s*/, ""), 166); doc.setFillColor(...teal).circle(18, y - 1.1, 0.8, "F"); doc.text(wrapped, 22, y); y += wrapped.length * 4.5 + 2;
    }); return y + 3;
  };
  const includedEnd = section("INCLUSO NESTA PROPOSTA", quote.included, 40, teal);
  const exclusionsEnd = section("NÃO INCLUSO / RESPONSABILIDADE DO CLIENTE", quote.exclusions, Math.max(includedEnd, 126), [155, 86, 45]);
  if (exclusionsEnd < 244) {
    doc.setDrawColor(180, 194, 198).line(margin, 252, 92, 252).line(118, 252, 194, 252);
    doc.setTextColor(...muted).setFontSize(8).text("Contratante / cliente", margin, 258).text("Responsável pela proposta", 118, 258).text("Data: ____ / ____ / ______", margin, 268);
  }
  footer(); return doc;
}

export function downloadQuotePdf(quote: QuoteDocument) {
  const safe = (quote.customer.name || "cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  buildQuotePdf(quote).save(`proposta-${quote.number}-${safe}.pdf`);
}
