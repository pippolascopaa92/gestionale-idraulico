import { useState } from "react";
import JSZip from "jszip";
import { HardDriveDownload, CheckCircle2, AlertCircle, Folder, FileText, Image, Package } from "lucide-react";
import { generateRapportinoP } from "../utils/generatePDF";

// ─── helpers ─────────────────────────────────────────────────────────────────

function readLS(key, fb) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; }
}

function sanitize(str) {
  return (str || "senza_nome")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\-_. ]/g, "_")
    .trim().replace(/\s+/g, "_")
    .slice(0, 60);
}

function fmtDataFile(iso) {
  if (!iso) return "senza_data";
  return (iso || "").slice(0, 10);
}

const TIPI_LABEL = {
  riparazione: "Riparazione", manutenzione: "Manutenzione",
  installazione: "Installazione", collaudo: "Collaudo", emergenza: "Emergenza",
};

// ─── componente ──────────────────────────────────────────────────────────────

export default function Backup() {
  const [stato,    setStato]    = useState("idle");  // idle | running | done | error
  const [progress, setProgress] = useState({ step: "", current: 0, total: 0 });
  const [log,      setLog]      = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const genera = async () => {
    setStato("running");
    setLog([]);
    setProgress({ step: "Avvio...", current: 0, total: 0 });

    try {
      const rapportini = readLS("rapportini", []);
      const clienti    = readLS("hydrodesk_clienti", []);
      const tecnici    = readLS("tecnici", []);
      const commesse   = readLS("hydrodesk_commesse", []);

      const zip        = new JSZip();
      const today      = new Date().toISOString().slice(0, 10);
      const rootFolder = `BACKUP_HYDRODESK_${today}`;

      let done = 0;
      const total = rapportini.length;
      setProgress({ step: "Generazione PDF...", current: 0, total });

      // Mappa commessa per rapportino
      const rapToCommessa = {};
      commesse.forEach(c => {
        (c.rapportiniIds || []).forEach(rid => { rapToCommessa[rid] = c; });
      });

      for (const r of rapportini) {
        const cliente     = clienti.find(c => c.id === r.clienteId);
        const nomeCliente = sanitize(cliente?.nome || r.cliente || "Cliente_sconosciuto");
        const commessa    = rapToCommessa[r.id];
        const nomeComm    = commessa ? sanitize(commessa.nome) : "Senza_commessa";
        const dataStr     = fmtDataFile(r.dataInizio ?? r.data);
        const tipoStr     = sanitize(TIPI_LABEL[r.tipoIntervento] || r.tipoIntervento || "Intervento");
        const baseName    = `${dataStr}_${tipoStr}`;

        const folderPath  = `${rootFolder}/${nomeCliente}/${nomeComm}`;

        // PDF rapportino
        try {
          const doc    = generateRapportinoP(r, clienti, tecnici);
          const pdfBlob = doc.output("arraybuffer");
          zip.file(`${folderPath}/${baseName}.pdf`, pdfBlob);
          addLog(`✓ PDF: ${nomeCliente}/${nomeComm}/${baseName}.pdf`);
        } catch (e) {
          addLog(`✗ Errore PDF: ${baseName} — ${e.message}`);
        }

        // Foto
        if (r.foto?.length > 0) {
          r.foto.forEach((f, i) => {
            try {
              const ext     = f.data?.startsWith("data:image/png") ? "png" : "jpg";
              const b64     = f.data.split(",")[1];
              const fname   = sanitize(f.name?.replace(/\.[^.]+$/, "") || `foto_${i + 1}`);
              zip.file(`${folderPath}/foto/${baseName}_${fname}.${ext}`, b64, { base64: true });
            } catch {
              // foto corrotta, skip silenzioso
            }
          });
          addLog(`  + ${r.foto.length} foto per ${baseName}`);
        }

        done++;
        setProgress({ step: "Generazione PDF...", current: done, total });

        // yield al browser ogni 5 rapportini per non bloccare l'UI
        if (done % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }

      // JSON dati grezzi come backup aggiuntivo
      setProgress({ step: "Compressione ZIP...", current: total, total });
      zip.file(`${rootFolder}/_dati_grezzi/rapportini.json`, JSON.stringify(rapportini, null, 2));
      zip.file(`${rootFolder}/_dati_grezzi/clienti.json`,    JSON.stringify(clienti, null, 2));
      zip.file(`${rootFolder}/_dati_grezzi/commesse.json`,   JSON.stringify(commesse, null, 2));
      zip.file(`${rootFolder}/_dati_grezzi/tecnici.json`,    JSON.stringify(tecnici, null, 2));

      addLog("Compressione ZIP in corso...");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });

      // Download
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${rootFolder}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog(`\nBackup completato: ${total} rapportini esportati.`);
      setStato("done");

    } catch (e) {
      addLog(`\nERRORE: ${e.message}`);
      setStato("error");
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const rapportini = readLS("rapportini", []);
  const clienti    = readLS("hydrodesk_clienti", []);
  const commesse   = readLS("hydrodesk_commesse", []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-[fadeSlideUp_0.3s_ease_both]">
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <HardDriveDownload className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Backup dati</h1>
          <p className="text-sm text-slate-500">Esporta tutto come file ZIP strutturato</p>
        </div>
      </div>

      {/* Info struttura */}
      <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Contenuto del backup</p>

        {/* Statistiche dati */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: FileText,  label: "Rapportini", value: rapportini.length },
            { icon: Package,   label: "Clienti",    value: clienti.length    },
            { icon: Folder,    label: "Commesse",   value: commesse.length   },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-50 dark:bg-white/3 rounded-xl p-3 text-center">
              <Icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Struttura cartelle */}
        <div className="rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 p-4 font-mono text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
          <p className="text-amber-400 font-semibold">BACKUP_HYDRODESK_YYYY-MM-DD.zip</p>
          <p className="pl-3">├── CLIENTE_NOME/</p>
          <p className="pl-6">│   ├── COMMESSA_NOME/</p>
          <p className="pl-9">│   │   ├── YYYY-MM-DD_Tipo.pdf</p>
          <p className="pl-9">│   │   └── foto/</p>
          <p className="pl-12">│   │       └── YYYY-MM-DD_Tipo_foto.jpg</p>
          <p className="pl-6">│   └── Senza_commessa/</p>
          <p className="pl-9">│       └── YYYY-MM-DD_Tipo.pdf</p>
          <p className="pl-3">└── _dati_grezzi/</p>
          <p className="pl-6">    ├── rapportini.json</p>
          <p className="pl-6">    ├── clienti.json</p>
          <p className="pl-6">    ├── commesse.json</p>
          <p className="pl-6">    └── tecnici.json</p>
        </div>
      </div>

      {/* Bottone genera */}
      {stato !== "running" && (
        <button
          onClick={() => { setStato("idle"); genera(); }}
          disabled={rapportini.length === 0}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl
            bg-amber-500 hover:bg-amber-400 text-[#060d1f] font-bold text-base
            transition-all hover:shadow-lg hover:shadow-amber-500/25
            disabled:opacity-40 disabled:cursor-not-allowed">
          <HardDriveDownload className="w-5 h-5" />
          {stato === "done"  ? "Genera nuovo backup" :
           stato === "error" ? "Riprova" :
           "Genera backup ZIP"}
        </button>
      )}

      {/* Progress */}
      {stato === "running" && (
        <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-sm font-medium text-slate-900 dark:text-white">{progress.step}</p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-200"
              style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-500 text-right">{progress.current} / {progress.total}</p>
        </div>
      )}

      {/* Esito */}
      {stato === "done" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">
            Backup completato — il file ZIP è stato scaricato
          </p>
        </div>
      )}
      {stato === "error" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 font-medium">Errore durante la generazione del backup</p>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-black/30 rounded-xl p-4 max-h-48 overflow-y-auto">
          <p className="text-xs text-slate-500 mb-2 font-mono uppercase tracking-wider">Log</p>
          {log.map((l, i) => (
            <p key={i} className={`text-xs font-mono ${l.startsWith("✗") ? "text-red-400" : l.startsWith("✓") ? "text-emerald-400" : "text-slate-400"}`}>
              {l}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
