import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Avance, Certificacion, Anticipo, Obra } from "../types";

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
  generateCertificacionPDF(cert: Certificacion, obra: Obra, anticipos: Anticipo[], totalesMensuales: any, itemsSate: Record<string, any>) {
    const doc = new jsPDF();
    const title = `Certificación Mensual - ${obra.nombre}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Mes: ${cert.mes}`, 14, 30);
    doc.text(`Estado: ${cert.estado.toUpperCase()}`, 14, 35);
    
    // Resumen General
    autoTable(doc, {
      startY: 45,
      head: [['Concepto', 'Cantidad']],
      body: [
        ['Total Ejecutado', `${cert.ejecutado.toLocaleString()}€`],
        ['Total Anticipos', `${cert.anticipos.toLocaleString()}€`],
        ['Neto a Certificar', `${cert.certificado.toLocaleString()}€`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 114, 255] }
    });
    
    // Detalle de Producción (Partidas)
    const finalYResumen = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detalle de Producción (Partidas)", 14, finalYResumen);

    const partidasData: any[] = [];
    
    // Fases
    [1, 2, 3].forEach(f => {
      if (totalesMensuales.fases[f] > 0) {
        const item = itemsSate[`fase${f}`];
        partidasData.push([item ? item.nombre : `Fase ${f}`, `${Math.round(totalesMensuales.fases[f])} m2`]);
      }
    });

    // Extras
    if (totalesMensuales.extras.dobleMalla > 0) {
      const item = itemsSate["malla"];
      partidasData.push([item ? item.nombre : "Doble Malla", `${Math.round(totalesMensuales.extras.dobleMalla)} m2`]);
    }
    if (totalesMensuales.extras.antifisuras > 0) {
      const item = itemsSate["anti"];
      partidasData.push([item ? item.nombre : "Antifisuras", `${Math.round(totalesMensuales.extras.antifisuras)} m2`]);
    }
    ["40", "80", "100"].forEach(c => {
      if (totalesMensuales.extras.cajeado[c as "40"|"80"|"100"] > 0) {
        const item = itemsSate[`cajeado${c}`];
        partidasData.push([item ? item.nombre : `Cajeado ${c}%`, `${Math.round(totalesMensuales.extras.cajeado[c as "40"|"80"|"100"])} m2`]);
      }
    });

    autoTable(doc, {
      startY: finalYResumen + 5,
      head: [['Concepto', 'Cantidad']],
      body: partidasData,
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100] }
    });
    
    // Detalle de Anticipos si existen
    if (anticipos.length > 0) {
      const finalYPartidas = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Detalle de Anticipos", 14, finalYPartidas);
      
      const anticiposData = anticipos.map(a => [
        new Date(a.fecha).toLocaleDateString(),
        a.operario,
        `${a.cantidad.toLocaleString()}€`
      ]);
      
      autoTable(doc, {
        startY: finalYPartidas + 5,
        head: [['Fecha', 'Operario', 'Cantidad']],
        body: anticiposData,
        theme: 'striped',
        headStyles: { fillColor: [255, 100, 0] }
      });
    }
    
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
  formatCertificacionForWhatsApp(cert: Certificacion, obra: Obra, totalesMensuales: any, itemsSate: Record<string, any>) {
    let text = `*CERTIFICACIÓN MENSUAL - ${obra.nombre}*\n`;
    text += `*Mes:* ${cert.mes}\n`;
    text += `*Estado:* ${cert.estado.toUpperCase()}\n\n`;
    
    text += `*PARTIDAS EJECUTADAS:*\n`;
    // Fases
    [1, 2, 3].forEach(f => {
      if (totalesMensuales.fases[f] > 0) {
        const item = itemsSate[`fase${f}`];
        text += `- ${item ? item.nombre : `Fase ${f}`}: ${Math.round(totalesMensuales.fases[f])} m2\n`;
      }
    });

    // Extras
    if (totalesMensuales.extras.dobleMalla > 0) {
      const item = itemsSate["malla"];
      text += `- ${item ? item.nombre : "Doble Malla"}: ${Math.round(totalesMensuales.extras.dobleMalla)} m2\n`;
    }
    if (totalesMensuales.extras.antifisuras > 0) {
      const item = itemsSate["anti"];
      text += `- ${item ? item.nombre : "Antifisuras"}: ${Math.round(totalesMensuales.extras.antifisuras)} m2\n`;
    }
    ["40", "80", "100"].forEach(c => {
      if (totalesMensuales.extras.cajeado[c as "40"|"80"|"100"] > 0) {
        const item = itemsSate[`cajeado${c}`];
        text += `- ${item ? item.nombre : `Cajeado ${c}%`}: ${Math.round(totalesMensuales.extras.cajeado[c as "40"|"80"|"100"])} m2\n`;
      }
    });

    text += `\n*RESUMEN:*\n`;
    text += `- Ejecutado: ${cert.ejecutado.toLocaleString()}€\n`;
    text += `- Anticipos: ${cert.anticipos.toLocaleString()}€\n`;
    text += `*Neto a Certificar: ${cert.certificado.toLocaleString()}€*`;
    
    return text;
  }
};
