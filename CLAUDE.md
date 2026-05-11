# CLAUDE.md — Gestionale Idraulico

Questo file viene letto automaticamente da Claude Code ad ogni conversazione.

---

## Progetto

App web offline-first per rapportini di lavoro di un'impresa idraulica.
Stack: React + Vite + Tailwind CSS v3 + localStorage.
Percorso: `D:\rapportino idraulico\gestionale-idraulico\`

Il file di memoria completo è in `memory/PROGETTO.md` — leggerlo per dettagli su struttura, decisioni tecniche, localStorage keys, ecc.

---

## Roadmap — trigger automatico

**Quando l'utente chiede la roadmap** (es. "mostrami la roadmap", "cosa resta da fare", "stato avanzamento", "prossimi passi") — leggere `memory/PROGETTO.md` e rispondere con questo schema:

### ✅ Fatto
| # | Feature | Modulo |
|---|---------|--------|
| 1 | BUG fix — picker magazzino mostrava solo quantità | NuovoRapportino.jsx |
| 2 | Magazzino — colonne prezzi: acquisto, ricarico %, vendita auto | Magazzino.jsx |
| 3 | Magazzino — categorie modificabili (add/rename/delete) | Magazzino.jsx |
| 4 | Rapportino — prezzi materiali (acq read-only, vend+ric editabili), €/ora manodopera, riepilogo costi, scalatura magazzino auto | NuovoRapportino.jsx |
| 5 | Dashboard — KPI cliccabili (oggi/bozze/settimana/emergenze) → lista filtrata con cliente, data, tecnico; tab Bozze/Completati/Emergenze | Dashboard.jsx |
| 6 | Clienti — storico interventi cliccabile: modal completo con descrizione, materiali+prezzi, totale, anomalie, foto zoomabili, firma | Clienti.jsx |
| 7 | Clienti — commesse/cartelle madre: crea/modifica/elimina, assegna/rimuovi rapportini, badge nello storico | Clienti.jsx |
| 7b | Commesse — pagina globale nella sidebar (raggruppa per cliente, ricerca) | CommessePage.jsx |
| 7c | Rapportino — selezione commessa nel form (dropdown se il cliente ha commesse) | NuovoRapportino.jsx |
| 8 | Clienti — tabella ore manodopera per tecnico: data, lavorazione, ore, €/h, subtotale tecnico, grand total | Clienti.jsx |

### ⬜ Da fare
| # | Feature | Modulo |
|---|---------|--------|
| 9 | Clienti — riepilogo spesa per categoria materiali | Clienti.jsx |
| 10 | Import Excel — prodotti in magazzino e materiali in rapportino | Magazzino + NuovoRapportino |
| 11 | Account utente — admin / soci / dipendenti con permessi | Nuovo modulo Auth |

### Completati nella roadmap estesa
| Modulo | Note |
|--------|------|
| Tickets | Rimosso — coperto dai rapportini con tipo "emergenza" |
| Manutenzioni | `Manutenzioni.jsx` — semaforo scadenze; NuovoRapportino ha toggle `isManutenzione` + `prossimaManutenzione` |
| Report & PDF | `Report.jsx` — tab Statistiche (KPI+grafici+tabella) e tab PDF (download singolo con jsPDF) |
| Backup | `Backup.jsx` — ZIP con struttura CLIENTE/COMMESSA/PDF+foto; richiede `jszip` + `jspdf` installati |

### Utility aggiunta
- `src/utils/generatePDF.js` — genera PDF jsPDF da un rapportino; usato da Report.jsx e Backup.jsx

---

## Regole operative

- Modificare i file sempre con Edit/Write diretti (mai copia-incolla)
- Dopo ogni sessione aggiornare `memory/PROGETTO.md` con i punti completati
- Chiavi localStorage ufficiali: `rapportini`, `hydrodesk_clienti`, `tecnici`, `hydrodesk_magazzino`, `hydrodesk_categorie`, `hydrodesk_commesse`, `hydrodesk:theme`, `hydrodesk:sidebar:collapsed`
- Tailwind: usare `dark:` per i nuovi moduli; CSS vars `var(--bg-page)` ecc. per componenti con molto styling inline
- No uuid, no date-fns — usare API native JS
- Nessun backend, tutto in localStorage
- Calendario in Dashboard: passare prop `embedded` per nascondere header/bottone duplicato
- Dashboard: usa `useNavigate` (non `window.location.hash`) per navigazione
