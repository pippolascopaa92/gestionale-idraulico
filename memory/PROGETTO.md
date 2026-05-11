# GESTIONALE RAPPORTINO LAVORO — IDRAULICO
> File di memoria del progetto. Va incollato nelle "Project Instructions" del progetto Claude.

---

## Obiettivo
App web offline-first per la gestione dei rapportini di lavoro di un'impresa idraulica.
Ispirata a rapportinilavoro.it, adattata al settore idraulico.
Stack: React + Vite + localStorage (nessun backend).

---

## Struttura cartelle progetto
```
gestionale-idraulico/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx       ✅
│   │   └── Topbar.jsx        ✅
│   ├── pages/
│   │   ├── PlaceholderPages.jsx  ✅  (Tickets, Manutenzioni, Report, Impostazioni)
│   │   ├── Dashboard.jsx         ✅  (calendario integrato + KPI cliccabili + lista filtrata)
│   │   ├── NuovoRapportino.jsx   ✅  (form completo + prezzi materiali + scalatura magazzino + selezione commessa)
│   │   ├── Clienti.jsx           ✅  (storico cliccabile + commesse per cliente)
│   │   ├── Calendario.jsx        ✅  (prop embedded per Dashboard)
│   │   ├── CommessePage.jsx      ✅  (pagina globale commesse, raggruppa per cliente)
│   │   ├── Rapportini.jsx        ✅  (lista rapportini — bug typo risolto)
│   │   └── Magazzino.jsx         ✅  (scorte + prezzi + categorie modificabili)
│   ├── data/
│   │   └── mockData.js       ✅
│   ├── hooks/
│   │   ├── useLocalStorage.js ✅
│   │   ├── useRapportini.js   ✅
│   │   ├── useClienti.js      ✅
│   │   └── useMagazzino.js    ✅  (nuovo)
│   ├── App.jsx               ✅
│   ├── main.jsx              ✅
│   └── index.css             ✅
├── memory/
│   └── PROGETTO.md
├── index.html                ✅
├── package.json              ✅
├── vite.config.js            ✅
├── tailwind.config.js        ✅
└── postcss.config.js         ✅
```

**Nota:** Layout.jsx del vecchio progetto Mac è stato rimosso. Rapportini.jsx esiste ed è il modulo lista rapportini.

---

## Moduli da sviluppare (in ordine)
1. [x] Setup progetto — completato
2. [x] App.jsx + Layout + Sidebar — completato
3. [x] Dashboard — completato (calendario integrato come sezione principale)
4. [x] Nuovo Rapportino — completato (include selezione materiali dal magazzino)
5. [x] Clienti — completato
6. [x] Calendario — completato (bug popup GCal risolto)
7. [x] Magazzino — completato (scorte, CRUD, integrato in NuovoRapportino)
8. [ ] Tickets — segnalazioni aperte/in corso/chiuse
9. [ ] Commesse — raggruppamento interventi per cantiere
10. [ ] Manutenzioni Ricorrenti — caldaie, impianti, scadenze
11. [ ] Report & PDF — statistiche e export rapportino stampabile
12. [ ] Light Mode — revisione finale (quasi completa)

---

## Campi Rapportino Idraulico
- Cliente (collegato ad anagrafica — dropdown centrato in cima alla sezione)
  - Appena selezionato, appare una scheda read-only con: nome, tipo, indirizzo completo, telefono, email, P.IVA, codice fiscale, note
  - I dati del cliente NON sono modificabili dal rapportino (solo visualizzati)
- Commessa (opzionale) — dropdown visibile solo se il cliente ha commesse in `hydrodesk_commesse`; assegnazione salvata nei `rapportiniIds` della commessa al momento del salvataggio
- Indirizzo intervento (modificabile — si precompila con l'indirizzo del cliente, ma può essere cambiato)
- Data e ora inizio/fine
- Tecnico assegnato
- Tipo intervento: riparazione / manutenzione / installazione / collaudo / emergenza
- Descrizione lavoro svolto
- Materiali utilizzati (lista: nome, quantità, unità, prezzoAcquisto read-only dal magazzino, ricarico %, prezzoVendita editabile, totale riga) — selezionabili dal magazzino
- Ore manodopera + €/ora manodopera (editabile) — totale manodopera calcolato in tempo reale
- Anomalie rilevate / note
- Foto allegate (max 10 per rapportino, salvate in base64)
- Firma cliente (canvas digitale)
- Stato: bozza / completato / inviato / fatturato

---

## Campi Prodotto Magazzino
- id, nome, categoria, quantita, unita, codice (opzionale), note
- prezzoAcquisto (IVA esclusa), ricarico (%), prezzoVendita (calcolato auto: acquisto × (1 + ricarico/100))

---

## Stack & scelte tecniche
- **Framework:** React + Vite 5
- **Stile:** Tailwind CSS v3 con `darkMode: 'class'`
- **Routing:** React Router v6
- **Persistenza:** localStorage (offline-first)
- **Icone:** Lucide React
- **ID univoci:** `Date.now().toString(36) + Math.random()` (no uuid — non in package.json)
- **Date:** API native JS (no date-fns — non in package.json)
- **PDF Export:** non ancora implementato (jsPDF non installato)
- **Nessun backend** — tutto gira in locale nel browser

---

## Design system
- Palette: navy scuro (#060d1f, #080f20, #0f2040) + accento amber (#f59e0b)
- Font: DM Sans (UI) + Space Mono (valori numerici)
- Sidebar collassabile, stato persistito in localStorage
- Topbar con breadcrumb dinamico + toggle dark/light mode
- Scrollbar custom, animazione page-enter su ogni pagina

---

## Dark / Light Mode — Stato attuale
- Implementata in App.jsx tramite ThemeContext + ThemeProvider
- Il toggle è nella Topbar
- Il tema viene persistito in localStorage con chiave `hydrodesk:theme`
- Default: dark
- `tailwind.config.js` usa `darkMode: 'class'`
- La classe `dark` viene aggiunta/rimossa su `document.documentElement`
- Hook da usare in ogni pagina: `import { useTheme } from '../App'`

### Approcci usati nei moduli:
- **NuovoRapportino.jsx** → usa variabili CSS custom (`var(--bg-page)`, `var(--text-1)`, ecc.)
- **Dashboard.jsx, Calendario.jsx, Clienti.jsx, Magazzino.jsx, Sidebar.jsx** → classi Tailwind `dark:`
- I nuovi moduli possono usare entrambi gli approcci; preferire CSS vars per componenti con molto styling inline

### Variabili CSS in index.css:
```css
:root { /* LIGHT MODE */
  --bg-page: #f8fafc; --bg-card: #ffffff; --bg-elevated: #f1f5f9;
  --bg-input: #ffffff; --border: #e2e8f0; --text-1: #0f172a; ...
}
.dark { /* DARK MODE */
  --bg-page: #060d1f; --bg-card: #080f20; --bg-elevated: #0f2040;
  --bg-input: #080f20; --border: #1e2d4a; --text-1: #e2e8f0; ...
}
```

---

## Integrazione Google Calendar
- Export manuale via URL precompilato (nessuna API, nessun OAuth)
- Dopo salvataggio rapportino → popup → `window.open(buildGcalUrl(...), '_blank')`
- Presente in: NuovoRapportino ✅, Calendario ✅
- Formato URL: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...`

---

## Magazzino — Dettagli implementazione
- Hook: `useMagazzino.js` → localStorage key `hydrodesk_magazzino`
- Pagina: `Magazzino.jsx` — lista prodotti con filtro categoria, ricerca, ±quantità inline, CRUD
- Colonne prezzi: prezzoAcquisto (IVA esclusa), ricarico %, prezzoVendita (calcolato auto nel form, salvato)
- Categorie modificabili: bottone "Categorie" → modal add/rename/delete, persistite in `hydrodesk_categorie`
- Colori scorte: verde ≥4, arancio 1-3, rosso 0
- Integrazione in NuovoRapportino: bottone "Dal magazzino" apre `MagazzinoPicker` con ricerca
  - Selezionare un prodotto precompila nome, unità, prezzoAcquisto, ricarico, prezzoVendita
  - La quantità in magazzino **viene scalata automaticamente** al primo salvataggio come completato/inviato/fatturato
  - Il flag `magazzinoScalato: true` sul rapportino impedisce doppio scalo in caso di re-salvataggio
  - La scalatura è diretta su localStorage (funzione `scalaMagazzino` in NuovoRapportino.jsx)

---

## Mappa localStorage — UFFICIALE
**ATTENZIONE:** Usare SEMPRE queste chiavi. Chiavi diverse causano bug di sincronizzazione.

| Dato | Chiave localStorage |
|------|-------------------|
| Rapportini | `rapportini` |
| Clienti | `hydrodesk_clienti` |
| Tecnici | `tecnici` |
| Magazzino | `hydrodesk_magazzino` |
| Categorie magazzino | `hydrodesk_categorie` |
| Commesse | `hydrodesk_commesse` |
| Tema UI | `hydrodesk:theme` |
| Sidebar collapsed | `hydrodesk:sidebar:collapsed` |

---

## Percorso progetto — Windows (attuale)
```
C:\Users\carlo\OneDrive - CL Grupo Industrial\Carlo - Personale\rapportino idraulico\gestionale-idraulico\
```
Il progetto era originariamente su Mac (`/Users/carlospada/progetti/...`) ed è stato migrato su Windows tramite OneDrive.

---

## Problema noto — OneDrive + Vite (EPERM)
OneDrive può bloccare Vite quando tenta di cancellare cartelle temporanee in `node_modules/.vite/`.
Il server crasha con errore `EPERM: operation not permitted, rmdir ... deps_temp_*`.

**Soluzione:** eliminare `node_modules\.vite` e riavviare:
```powershell
Remove-Item -Recurse -Force "...gestionale-idraulico\node_modules\.vite"
# poi riavviare npm run dev
```

---

## Regola operativa — Modifiche ai file
Con **Claude Code** si modificano i file direttamente con Edit/Write, senza copia-incolla.

---

## Piano sviluppo — Roadmap da "istruzioni e aggiornamenti.docx"
*(ignorare il layout delle immagini nel docx — implementare solo le funzionalità descritte)*

| # | Feature | Modulo | Stato |
|---|---------|--------|-------|
| 1 | **BUG** — nel rapportino, scegliendo prodotto dal magazzino appare solo la quantità, non il nome | NuovoRapportino.jsx | ✅ Fatto |
| 2 | Magazzino — aggiungere colonne: prezzo acquisto (IVA esclusa), % ricarico, prezzo vendita calcolato auto | Magazzino.jsx + useMagazzino.js | ✅ Fatto |
| 3 | Magazzino — categorie modificabili: aggiungere, rinominare, con bottone "Modifica categorie" | Magazzino.jsx | ✅ Fatto |
| 4 | Rapportino — prezzi materiali: costo acquisto (non modificabile, dal magazzino), costo vendita (modificabile + % ricarico), costo €/ora manodopera modificabile + scalare magazzino automaticamente al completamento | NuovoRapportino.jsx | ✅ Fatto |
| 5 | Dashboard — KPI cliccabili (oggi / bozze / settimana / emergenze) → lista filtrata con cliente, data, tecnico; tab aggiuntivi Bozze / Completati / Emergenze; toggle KPI per reset | Dashboard.jsx | ✅ Fatto |
| 6 | Clienti — storico interventi cliccabile: modal completo con descrizione, materiali+prezzi, totale intervento, anomalie, foto zoomabili, firma cliente | Clienti.jsx | ✅ Fatto |
| 7 | Clienti — commesse: cartelle per cantiere/progetto con crea/modifica/elimina, assegna/rimuovi rapportini, badge nello storico | Clienti.jsx | ✅ Fatto |
| 8 | Clienti — tabella ore dipendenti: data, lavorazione, ore per tecnico, tot ore, costo €/h, costo finale | Clienti.jsx | ✅ Fatto |
| 9 | Clienti — riepilogo spesa per categoria: tot materiali per categoria (rubinetteria ecc.) con costo acquisto e vendita | Clienti.jsx | ⬜ Da fare |
| 10 | Import Excel: caricare prodotti nel magazzino da Excel; caricare materiali nel rapportino da Excel | Magazzino.jsx + NuovoRapportino.jsx | ⬜ Da fare |
| 11 | Account utente: admin, soci (accesso completo), dipendenti (permessi configurabili con flag) | Nuovo modulo Auth | ⬜ Da fare |

---

## Bug aperti
*(nessun bug aperto al momento)*

---

## Bug risolti
| Bug | File | Risolto |
|-----|------|---------|
| Nel rapportino, scegliendo prodotto dal magazzino appare solo la quantità, non il nome | NuovoRapportino.jsx | ✅ Aggiunto MagazzinoPicker modal con nome + unità precompilati |
| Quantità magazzino non si scala automaticamente | NuovoRapportino.jsx | ✅ Scalo auto al primo salvataggio completato/inviato/fatturato; flag `magazzinoScalato` evita doppio scalo |
| Pagina Rapportini crashava (variabile `rapporto` invece di `rapportino`) | Rapportini.jsx | ✅ Typo corretto — bozze e rapportini ora visibili |
| Bottone "Nuovo intervento" in Dashboard non navigava | Dashboard.jsx | ✅ Sostituito `window.location.hash` con `useNavigate` |
| Calendario in Dashboard mostrava bottone "Nuovo intervento" duplicato | Calendario.jsx | ✅ Aggiunta prop `embedded` che nasconde header+bottone |
| Pagina Commesse (sidebar) mostrava placeholder "modulo in sviluppo" | CommessePage.jsx | ✅ Creata pagina reale con lista commesse per cliente |
| Popup GCal non appariva dopo salvataggio | NuovoRapportino.jsx | ✅ |
| Link markdown corrotti nel JSX | NuovoRapportino.jsx | ✅ Risolto migrando a Claude Code |
| Popup GCal nel Calendario non funzionava | Calendario.jsx | ✅ |
| Tutti i file src mancanti (migrazione Mac→Windows) | tutti | ✅ Ricreati da zero con Claude Code |
| Server Vite crasha con EPERM su OneDrive | node_modules/.vite | ✅ Fix: rimuovere .vite e riavviare |

---

## Stato avanzamento
| Modulo | Stato | Note |
|--------|-------|------|
| Setup progetto | ✅ Fatto | Vite + React + Tailwind + Router |
| App.jsx + Sidebar + Topbar | ✅ Fatto | Sidebar collassabile, routing completo |
| Dashboard | ✅ Fatto | KPI cliccabili (filtrano lista), tab Bozze/Completati/Emergenze, calendario integrato, nomi cliente/tecnico risolti da localStorage |
| Nuovo Rapportino | ✅ Fatto | Form completo, firma, foto, GCal, magazzino, scheda cliente, prezzi, €/ora, riepilogo costi, scalatura magazzino, selezione commessa |
| Clienti | ✅ Fatto | Lista, scheda, CRUD, storico cliccabile (modal dettaglio + foto zoom), commesse per cliente |
| Calendario | ✅ Fatto | Vista mensile, pannello giorno, GCal export, prop `embedded` per Dashboard |
| Magazzino | ✅ Fatto | CRUD prodotti, scorte, colonne prezzi (acq/ric/vend), categorie modificabili |
| Commesse | ✅ Fatto | Pagina globale (CommessePage.jsx) + gestione per cliente in Clienti.jsx + selezione nel form rapportino |
| Rapportini | ✅ Fatto | Lista con filtri stato, navigazione al form — bug typo risolto |
| Tickets | 🗑️ Rimosso | Funzionalità coperta dai rapportini |
| Manutenzioni | ✅ Fatto | Pagina con semaforo scadenze; campo isManutenzione+prossimaManutenzione in NuovoRapportino |
| Report & PDF | ✅ Fatto | Tab Statistiche (KPI, grafici barre, tabella) + Tab PDF (download singolo rapportino) |
| Backup | ✅ Fatto | Pagina Backup: ZIP con struttura CLIENTE/COMMESSA/PDF+foto, + JSON grezzi |
| Light Mode | 🟡 Quasi fatto | CSS vars implementate, manca verifica visiva |

---

## Decisioni prese
- Offline-first, nessun login
- I dati vivono in localStorage
- Tailwind CSS v3 (non v4, incompatibile), `darkMode: 'class'`
- Design navy + amber, font DM Sans + Space Mono
- Cartella progetto ha spazio nel nome: usare sempre virgolette nei comandi
- Dashboard legge da localStorage, fallback su mockData se vuoto
- Route rapportino: `/rapportino/nuovo` e `/rapportino/:id`
- Foto in base64 su localStorage, max 10 per rapportino
- Le Commesse raggruppano rapportini per cantiere con storico cronologico
- Toggle dark/light in Topbar, ThemeContext globale in App.jsx
- Componenti come Field vanno definiti FUORI dai componenti padre (evita remount a ogni keystroke)
- GCal: popup dopo salvataggio, URL precompilato, nessuna API
- Magazzino: quantità scalata automaticamente al primo salvataggio del rapportino come completato/inviato/fatturato (flag `magazzinoScalato` su rapportino evita doppio scalo)
- Dashboard: calendario come sezione principale (non widget laterale), cliccabile giorno per giorno
- NuovoRapportino sezione Cliente: dropdown centrato + scheda cliente read-only (nome, indirizzo, tel, email, P.IVA, CF, note). I dati del cliente non si editano dal rapportino, servono solo come riferimento visivo
- Modifiche ai file: solo Claude Code con Edit/Write diretti

---
*Aggiornato: Maggio 2026 — Roadmap #1–8 completate. Aggiunta sezione "Ore manodopera" nella scheda cliente: tabella raggruppata per tecnico con data, lavorazione, ore, €/h, totale, subtotale per tecnico e grand total. La sezione è visibile solo se almeno un rapportino ha ore registrate. Prossimi: #9 spesa categorie, #10 import Excel.*
