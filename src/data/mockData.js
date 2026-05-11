export const TECNICI = [
  { id: 't1', nome: 'Marco Rossi' },
  { id: 't2', nome: 'Luca Bianchi' },
  { id: 't3', nome: 'Giorgio Ferrari' },
];

export const TIPI_INTERVENTO = [
  'Riparazione',
  'Manutenzione',
  'Installazione',
  'Collaudo',
  'Emergenza',
];

export const STATI_RAPPORTINO = [
  'Bozza',
  'Completato',
  'Inviato',
  'Fatturato',
];

export const clientiIniziali = [
  {
    id: 'c1',
    nome: 'Mario Colombo',
    telefono: '333 1234567',
    email: 'mario.colombo@email.it',
    indirizzo: 'Via Roma 12, Bergamo',
    note: 'Condominio 3 piani',
  },
  {
    id: 'c2',
    nome: 'Condominio Viale Europa',
    telefono: '035 987654',
    email: 'amministratore@vialeuropa.it',
    indirizzo: 'Viale Europa 44, Bergamo',
    note: 'Contattare solo mattina',
  },
  {
    id: 'c3',
    nome: 'Ristorante Da Luigi',
    telefono: '035 112233',
    email: 'luigi@ristorantedeluigi.it',
    indirizzo: 'Via Garibaldi 8, Dalmine',
    note: 'Chiuso il lunedì',
  },
];

export const rapportiniIniziali = [
  {
    id: 'r1',
    clienteId: 'c1',
    clienteNome: 'Mario Colombo',
    indirizzo: 'Via Roma 12, Bergamo',
    data: '2026-04-24',
    oraInizio: '09:00',
    oraFine: '11:30',
    tecnico: 'Marco Rossi',
    tipoIntervento: 'Riparazione',
    descrizione: 'Sostituzione valvola termostatica radiatore camera da letto.',
    materiali: [
      { nome: 'Valvola termostatica', quantita: 1, unita: 'pz' },
      { nome: 'Teflon', quantita: 1, unita: 'rotolo' },
    ],
    oreManodopera: 2.5,
    anomalie: 'Impianto vecchio, consigliata revisione generale.',
    stato: 'Completato',
    foto: [],
    firmaCliente: null,
  },
  {
    id: 'r2',
    clienteId: 'c2',
    clienteNome: 'Condominio Viale Europa',
    indirizzo: 'Viale Europa 44, Bergamo',
    data: '2026-04-25',
    oraInizio: '14:00',
    oraFine: '16:00',
    tecnico: 'Luca Bianchi',
    tipoIntervento: 'Manutenzione',
    descrizione: 'Manutenzione annuale caldaia centralizzata.',
    materiali: [
      { nome: 'Filtro caldaia', quantita: 1, unita: 'pz' },
    ],
    oreManodopera: 2,
    anomalie: '',
    stato: 'Inviato',
    foto: [],
    firmaCliente: null,
  },
  {
    id: 'r3',
    clienteId: 'c3',
    clienteNome: 'Ristorante Da Luigi',
    indirizzo: 'Via Garibaldi 8, Dalmine',
    data: '2026-04-27',
    oraInizio: '08:00',
    oraFine: null,
    tecnico: 'Marco Rossi',
    tipoIntervento: 'Emergenza',
    descrizione: 'Perdita tubo sotto lavello cucina.',
    materiali: [],
    oreManodopera: null,
    anomalie: '',
    stato: 'Bozza',
    foto: [],
    firmaCliente: null,
  },
];
