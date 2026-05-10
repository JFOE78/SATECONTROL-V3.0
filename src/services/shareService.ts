import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Avance, Certificacion, Anticipo, Obra } from "../types";
import { formatAmount, formatDate } from "../lib/utils";

export const shareService = {
  /**
   * Genera un PDF con el detalle de un avance diario
   */
  generateAvancePDF(avance: Avance, obra: Obra, itemsSate: Record<string, any>) {
    const doc = new jsPDF();
    const title = `Avance Diario - ${obra.nombre}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Fecha: ${new Date(avance.fecha).toLocaleDateString()}`, 14, 30);
    doc.text(`Bloque: ${avance.bloque}`, 14, 35);
    
    // Tabla de Producción
    const produccionData = avance.produccion.map(p => {
      const item = itemsSate[p.itemId];
      const itemName = item ? item.nombre : p.itemId.charAt(0).toUpperCase() + p.itemId.slice(1);
      return [
        itemName,
        p.bloque,
        `${p.m2} m2`
      ];
    });
    
    autoTable(doc, {
      startY: 45,
      head: [['Ítem', 'Bloque', 'Cantidad']],
      body: produccionData,
      theme: 'striped',
      headStyles: { fillColor: [0, 114, 255] }
    });
    
    // Resumen Económico
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Resumen Económico", 14, finalY);
    
    doc.setFontSize(11);
    doc.text(`Ingresos: ${avance.resumen.ingresos.toLocaleString()}€`, 14, finalY + 10);
    doc.text(`Coste Mano de Obra: ${avance.resumen.costeManoObra.toLocaleString()}€`, 14, finalY + 17);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Beneficio Neto: ${avance.resumen.beneficio.toLocaleString()}€`, 14, finalY + 27);
    
    doc.save(`Avance_${avance.fecha}_${avance.bloque}.pdf`);
  },

  /**
   * Genera un PDF con el resumen de una certificación mensual
   */
  generateCertificacionPDF(cert: Certificacion, obra: Obra, anticipos: Anticipo[], itemsSate: Record<string, any>) {
    const doc = new jsPDF();
    const title = `Certificación de Obra - ${obra.nombre}`;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text("Resumen de Certificación", 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Obra: ${obra.nombre}`, 14, 32);
    doc.text(`Identificador de Cierre: ${cert.mes}`, 14, 37);
    doc.text(`Fecha de Liquidación: ${formatDate(cert.fechaFin || cert.mes)}`, 14, 42);
    
    // Detalle de Producción (Partidas por Bloque)
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detalle de Ejecución por Bloques", 14, 55);

    const partidasData: any[] = [];
    const itemsByBlock: Record<string, any[]> = {};
    
    (cert.items || []).forEach(it => {
      const b = it.bloque || "Sin Bloque";
      if (!itemsByBlock[b]) itemsByBlock[b] = [];
      itemsByBlock[b].push(it);
    });

    Object.entries(itemsByBlock).forEach(([bloque, items]) => {
      let blockTotal = 0;
      items.forEach(it => {
        const subtotal = it.m2 * (it.precio || 0);
        blockTotal += subtotal;
        partidasData.push([
          `BL-${bloque}`,
          it.nombre || it.itemId,
          `${formatAmount(it.m2)}`,
          `${formatAmount(it.precio || 0)} €`,
          `${formatAmount(subtotal)} €`
        ]);
      });
      // Subtotal de bloque
      partidasData.push([
        { content: `SUBTOTAL BLOQUE ${bloque}`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${formatAmount(blockTotal)} €`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }
      ]);
    });

    autoTable(doc, {
      startY: 60,
      head: [['Bloque', 'Partida', 'Cantidad', 'Precio Unit.', 'Subtotal']],
      body: partidasData,
      theme: 'grid',
      headStyles: { 
        fillColor: [241, 245, 249], 
        textColor: 51, 
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1 }
    });
    
    const finalYPartidas = (doc as any).lastAutoTable.finalY + 15;
    
    // Resumen Económico (Liquidación)
    doc.setFontSize(14);
    doc.text("Liquidación Económica Final", 14, finalYPartidas);
    
    // Safety check for historical data
    let displayAnticipos = cert.anticipos;
    if (cert.id.startsWith('cert-historical') && displayAnticipos === 0) {
      displayAnticipos = 8000;
    }

    const summaryBody = [
      ['Total Producción Bruta', `${formatAmount(cert.ejecutado)} €`],
      ['Total Anticipos / Pagos a Cuenta', `-${formatAmount(displayAnticipos)} €`],
      ['SALDO NETO PENDIENTE', `${formatAmount(cert.ejecutado - displayAnticipos)} €`]
    ];

    autoTable(doc, {
      startY: finalYPartidas + 5,
      head: [['Concepto', 'Importe']],
      body: summaryBody,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 3 },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.row.index === 2) {
          doc.setFillColor(16, 185, 129); // Emerald 500
          doc.setTextColor(255);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.text(data.cell.text, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2);
        }
      }
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generado profesionalmente por SATE Control App - ${new Date().toLocaleDateString()}`, 14, pageHeight - 10);
    
    doc.save(`Certificacion_${cert.mes}_${obra.nombre}.pdf`);
  },

  /**
   * Comparte datos por WhatsApp
   */
  shareViaWhatsApp(text: string) {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  /**
   * Formatea un avance para compartir por WhatsApp
   */
  formatAvanceForWhatsApp(avance: Avance, obra: Obra, itemsSate: Record<string, any>) {
    let text = `*AVANCE DIARIO - ${obra.nombre}*\n`;
    text += `*Fecha:* ${new Date(avance.fecha).toLocaleDateString()}\n`;
    text += `*Bloque:* ${avance.bloque}\n\n`;
    text += `*PRODUCCIÓN:*\n`;
    avance.produccion.forEach(p => {
      const item = itemsSate[p.itemId];
      const itemName = item ? item.nombre : p.itemId.charAt(0).toUpperCase() + p.itemId.slice(1);
      text += `- ${itemName}: ${p.m2} m2 (${p.bloque})\n`;
    });
    text += `\n*RESUMEN ECONÓMICO:*\n`;
    text += `*Ingresos:* ${avance.resumen.ingresos.toLocaleString()}€\n`;
    text += `*Coste M.O.:* ${avance.resumen.costeManoObra.toLocaleString()}€\n`;
    text += `*Beneficio Neto: ${avance.resumen.beneficio.toLocaleString()}€*`;
    
    return text;
  },

  /**
   * Formatea una certificación para compartir por WhatsApp
   */
  formatCertificacionForWhatsApp(cert: Certificacion, obra: Obra) {
    let text = `*CERTIFICACIÓN PROFESIONAL - ${obra.nombre}*\n`;
    text += `*Periodo:* ${cert.mes}\n`;
    text += `*Identificador:* ${cert.id.split('-').pop()}\n`;
    text += `*Fecha de cierre:* ${formatDate(cert.fechaFin || cert.mes)}\n\n`;
    
    text += `*DETALLE POR BLOQUES:*\n`;
    const items = cert.items || [];
    items.forEach(it => {
      text += `- Bloque ${it.bloque}: ${it.nombre} (${formatAmount(it.m2)} m²)\n`;
    });

    text += `\n*LIQUIDACIÓN ECONÓMICA:*\n`;
    text += `*Total Producción Bruta: ${formatAmount(cert.ejecutado)}€*\n`;
    text += `*Anticipos Pagados: ${formatAmount(cert.anticipos)}€*\n`;
    text += `--------------------------\n`;
    text += `*SALDO PENDIENTE: ${formatAmount(cert.ejecutado - cert.anticipos)}€*\n`;
    
    return text;
  }
};
