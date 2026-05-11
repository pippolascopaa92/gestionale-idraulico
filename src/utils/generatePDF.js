import jsPDF from "jspdf";

// ─── palette ─────────────────────────────────────────────────────────────────
const C_AMBER  = [245, 158, 11];
const C_NAVY   = [8,   15,  32];
const C_WHITE  = [255, 255, 255];
const C_DARK   = [30,  41,  59];
const C_MID    = [71,  85,  105];
const C_LIGHT  = [148, 163, 184];
const C_BORDER = [226, 232, 240];
const C_RED    = [239, 68,  68];
const C_ROW    = [248, 250, 252];

const TIPI_LABEL = {
  riparazione:   "Riparazione",
  manutenzione:  "Manutenzione",
  installazione: "Installazione",
  collaudo:      "Collaudo",
  emergenza:     "Emergenza",
};

const STATI_LABEL = {
  bozza:      "Bozza",
  completato: "Completato",
  inviato:    "Inviato",
  fatturato:  "Fatturato",
};

function fmtData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtNum(n, decimals = 2) {
  const v = parseFloat(n);
  return isNaN(v) ? "—" : v.toFixed(decimals);
}

// ─── generatore principale ────────────────────────────────────────────────────
export function generateRapportinoP(rapportino, clienti = [], tecnici = []) {
  const doc  = new jsPDF("p", "mm", "a4");
  const W    = 210;
  const M    = 14;   // margine laterale
  const IW   = W - M * 2;
  let y      = 0;

  const cliente     = clienti.find(c => c.id === rapportino.clienteId);
  const nomeTecnico = rapportino.tecnico || tecnici.find(t => t.id === rapportino.tecnicoId)?.nome || "";
  const nomeCliente = cliente?.nome || rapportino.cliente || "Cliente sconosciuto";
  const dataInt     = fmtData(rapportino.dataInizio ?? rapportino.data);

  // ── helpers ──────────────────────────────────────────────────────────────
  const setStyle = (size, color, bold = false) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont("helvetica", bold ? "bold" : "normal");
  };

  const txt = (str, x, yp, { size = 10, color = C_DARK, bold = false, align = "left", maxW } = {}) => {
    setStyle(size, color, bold);
    const s = String(str ?? "");
    if (maxW) {
      const lines = doc.splitTextToSize(s, maxW);
      doc.text(lines, x, yp, { align });
      return lines.length;
    }
    doc.text(s, x, yp, { align });
    return 1;
  };

  const hline = (yp, color = C_BORDER, w = 0.25) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(w);
    doc.line(M, yp, W - M, yp);
  };

  const fill = (x, yp, w, h, color) => {
    doc.setFillColor(...color);
    doc.rect(x, yp, w, h, "F");
  };

  const checkY = (needed) => {
    if (y + needed > 282) {
      doc.addPage();
      y = M;
    }
  };

  const sectionTitle = (label, color = C_AMBER) => {
    checkY(10);
    txt(label, M, y, { size: 7, color, bold: true });
    y += 5;
  };

  // ── HEADER ───────────────────────────────────────────────────────────────
  fill(0, 0, W, 22, C_NAVY);
  txt("HydroDesk", M, 12, { size: 15, color: C_AMBER, bold: true });
  txt("RAPPORTINO DI LAVORO", W - M, 8, { size: 8, color: C_LIGHT, align: "right" });
  const tipoLabel = TIPI_LABEL[rapportino.tipoIntervento] || rapportino.tipoIntervento || "Intervento";
  txt(tipoLabel.toUpperCase(), W - M, 16, { size: 9, color: C_WHITE, bold: true, align: "right" });

  y = 30;

  // ── INFO ROW (4 colonne) ─────────────────────────────────────────────────
  const cW = IW / 4;
  const infoCol = (label, value, col) => {
    const x = M + col * cW;
    txt(label, x, y,      { size: 7, color: C_LIGHT });
    txt(value || "—", x, y + 5, { size: 9, color: C_DARK, bold: true, maxW: cW - 2 });
  };
  const orario = [rapportino.oraInizio, rapportino.oraFine].filter(Boolean).join(" → ") || "—";
  const stato  = STATI_LABEL[rapportino.stato] || rapportino.stato || "—";

  infoCol("Data intervento", dataInt,    0);
  infoCol("Orario",          orario,     1);
  infoCol("Tecnico",         nomeTecnico || "—", 2);
  infoCol("Stato",           stato,      3);

  y += 16;
  hline(y);
  y += 6;

  // ── CLIENTE ──────────────────────────────────────────────────────────────
  sectionTitle("CLIENTE");
  txt(nomeCliente, M, y, { size: 12, color: C_DARK, bold: true });
  y += 6;
  if (cliente) {
    const addr = [cliente.indirizzo, cliente.citta, cliente.provincia].filter(Boolean).join(", ");
    if (addr) { txt(addr, M, y, { size: 8, color: C_MID }); y += 4.5; }
    const cont = [cliente.telefono, cliente.email].filter(Boolean).join("   |   ");
    if (cont) { txt(cont, M, y, { size: 8, color: C_MID }); y += 4.5; }
  }
  if (rapportino.indirizzoIntervento) {
    txt("Luogo intervento: " + rapportino.indirizzoIntervento, M, y, { size: 8, color: C_MID });
    y += 4.5;
  }
  y += 2;
  hline(y);
  y += 6;

  // ── DESCRIZIONE ──────────────────────────────────────────────────────────
  if (rapportino.descrizione) {
    sectionTitle("LAVORO SVOLTO");
    const lines = doc.splitTextToSize(rapportino.descrizione, IW);
    checkY(lines.length * 4.5 + 4);
    setStyle(9, C_DARK);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 5;
    hline(y);
    y += 6;
  }

  // ── MATERIALI ─────────────────────────────────────────────────────────────
  if (rapportino.materiali?.length > 0) {
    checkY(18);
    sectionTitle("MATERIALI UTILIZZATI");

    // colonne: nome 36%, qtà 9%, um 9%, acq 12%, vend 12%, tot 12%, pad 10%
    const COLS = [0.36, 0.09, 0.09, 0.12, 0.12, 0.12, 0.10];
    const colX = COLS.reduce((acc, _, i) => {
      acc.push(i === 0 ? M : acc[i - 1] + COLS[i - 1] * IW);
      return acc;
    }, []);
    const HDR = ["Materiale", "Qtà", "U.M.", "Acq. €", "Vend. €", "Totale", ""];

    fill(M, y - 3.5, IW, 7, [241, 245, 249]);
    HDR.forEach((h, i) => txt(h, colX[i] + 1, y + 0.5, { size: 7, color: C_MID, bold: true }));
    y += 7;

    rapportino.materiali.forEach((m, i) => {
      checkY(7);
      if (i % 2 === 0) fill(M, y - 3.5, IW, 6.5, C_ROW);
      const totR = (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0);
      const row = [
        m.nome || "—",
        String(m.quantita || "—"),
        m.unita || "—",
        m.prezzoAcquisto ? fmtNum(m.prezzoAcquisto) + " €" : "—",
        m.prezzoVendita  ? fmtNum(m.prezzoVendita)  + " €" : "—",
        totR > 0 ? fmtNum(totR) + " €" : "—",
        "",
      ];
      row.forEach((d, j) => {
        txt(d, colX[j] + 1, y + 0.5, {
          size: 8,
          color: j === 5 ? C_AMBER : C_DARK,
          bold: j === 5,
          maxW: COLS[j] * IW - 2,
        });
      });
      y += 6.5;
    });
    y += 3;
    hline(y);
    y += 6;
  }

  // ── RIEPILOGO COSTI ───────────────────────────────────────────────────────
  const totMat = (rapportino.materiali || []).reduce(
    (s, m) => s + (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0), 0);
  const totMan = (parseFloat(rapportino.oreManodopera) || 0) * (parseFloat(rapportino.costoOrario) || 0);
  const totInt = totMat + totMan;

  if (totInt > 0 || rapportino.oreManodopera) {
    checkY(28);
    sectionTitle("RIEPILOGO COSTI");
    const rightX = W - M;

    if (rapportino.oreManodopera) {
      txt("Ore manodopera:", M, y, { size: 9, color: C_MID });
      txt(`${rapportino.oreManodopera}h  x  ${rapportino.costoOrario || 0} /h  =  ${fmtNum(totMan)} EUR`, rightX, y, { size: 9, color: C_DARK, align: "right" });
      y += 5.5;
    }
    if (totMat > 0) {
      txt("Materiali:", M, y, { size: 9, color: C_MID });
      txt(`${fmtNum(totMat)} EUR`, rightX, y, { size: 9, color: C_DARK, align: "right" });
      y += 5.5;
    }
    hline(y, C_MID, 0.4);
    y += 5;
    txt("TOTALE INTERVENTO", M, y, { size: 11, color: C_DARK, bold: true });
    txt(`${fmtNum(totInt)} EUR`, rightX, y, { size: 13, color: C_AMBER, bold: true, align: "right" });
    y += 9;
    hline(y);
    y += 6;
  }

  // ── ANOMALIE ──────────────────────────────────────────────────────────────
  if (rapportino.anomalie) {
    checkY(14);
    sectionTitle("ANOMALIE / NOTE", C_RED);
    const lines = doc.splitTextToSize(rapportino.anomalie, IW);
    checkY(lines.length * 4.5 + 4);
    setStyle(9, C_DARK);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 5;
    hline(y);
    y += 6;
  }

  // ── MANUTENZIONE PERIODICA ────────────────────────────────────────────────
  if (rapportino.isManutenzione && rapportino.prossimaManutenzione) {
    checkY(12);
    sectionTitle("MANUTENZIONE PERIODICA");
    txt("Prossimo controllo previsto: " + fmtData(rapportino.prossimaManutenzione), M, y, { size: 9, color: C_DARK, bold: true });
    y += 6;
    hline(y);
    y += 6;
  }

  // ── FIRMA ────────────────────────────────────────────────────────────────
  if (rapportino.firma) {
    checkY(38);
    sectionTitle("FIRMA CLIENTE");
    try {
      doc.addImage(rapportino.firma, "PNG", M, y, 70, 25);
      y += 28;
    } catch {
      txt("(firma non disponibile)", M, y, { size: 8, color: C_LIGHT });
      y += 8;
    }
    hline(y);
    y += 6;
  }

  // ── FOOTER su ogni pagina ─────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    hline(292, C_BORDER);
    txt(`HydroDesk  —  Rapportino del ${dataInt}  —  Cliente: ${nomeCliente}`, M, 296, { size: 6.5, color: C_LIGHT });
    txt(`${p} / ${total}`, W - M, 296, { size: 6.5, color: C_LIGHT, align: "right" });
  }

  // ── FOTO (pagine aggiuntive) ───────────────────────────────────────────────
  if (rapportino.foto?.length > 0) {
    rapportino.foto.forEach((f, i) => {
      if (i % 2 === 0) {
        doc.addPage();
        fill(0, 0, W, 14, C_NAVY);
        txt(`Foto allegate — ${nomeCliente} — ${dataInt}`, M, 9, { size: 9, color: C_AMBER, bold: true });
        txt(`${i + 1}–${Math.min(i + 2, rapportino.foto.length)} di ${rapportino.foto.length}`, W - M, 9, { size: 8, color: C_LIGHT, align: "right" });
      }
      const photoY = i % 2 === 0 ? 20 : 158;
      const photoH = 130;
      try {
        const ext = f.data?.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(f.data, ext, M, photoY, IW, photoH);
        txt(f.name || `Foto ${i + 1}`, M, photoY + photoH + 3, { size: 7, color: C_LIGHT });
      } catch {
        fill(M, photoY, IW, photoH, C_ROW);
        txt(`[Foto ${i + 1} — formato non supportato]`, M + IW / 2, photoY + photoH / 2, { size: 9, color: C_LIGHT, align: "center" });
      }
    });
  }

  return doc;
}
