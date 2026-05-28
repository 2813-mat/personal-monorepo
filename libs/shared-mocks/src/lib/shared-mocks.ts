import type {
  Card,
  Income,
  Category,
  FixedExpense,
  Goal,
  Transaction,
} from '@caixa-familia/shared-types';

export const MOCK_CARDS: Card[] = [
  { id: 'nu-t',  name: 'Nubank',    holder: 'Thais',  bank: 'Nubank',    color: '#820AD1', closing: 5,  due: 12, current: 1895.00, limit: 4500, last4: '4421' },
  { id: 'nu-m',  name: 'Nubank',    holder: 'Mateus', bank: 'Nubank',    color: '#820AD1', closing: 8,  due: 15, current: 1342.67, limit: 3800, last4: '7088' },
  { id: 'pp-m',  name: 'PicPay',    holder: 'Mateus', bank: 'PicPay',    color: '#11C76F', closing: 14, due: 21, current:  591.08, limit: 2000, last4: '5510' },
  { id: 'it-m',  name: 'Itaú',      holder: 'Mateus', bank: 'Itaú',      color: '#EC7000', closing: 18, due: 25, current:  452.53, limit: 5200, last4: '3367' },
  { id: 'rn-t',  name: 'Renner',    holder: 'Thais',  bank: 'Renner',    color: '#1C1C1C', closing: 20, due: 28, current:  443.73, limit: 1500, last4: '1098' },
  { id: 'sa-t',  name: 'Santander', holder: 'Thais',  bank: 'Santander', color: '#EC0000', closing: 28, due: 5,  current:   65.99, limit: 3000, last4: '2245' },
  { id: 'in-t',  name: 'Inter',     holder: 'Thais',  bank: 'Inter',     color: '#FF7A00', closing: 1,  due: 8,  current:    0.00, limit: 1200, last4: '6634' },
];

export const MOCK_INCOMES: Income[] = [
  { id: 'sal-m', label: 'Salário Mateus', holder: 'Mateus', value: 1700.00, date: '2026-05-05', recurring: true },
  { id: 'sal-t', label: 'Salário Thais',  holder: 'Thais',  value: 5793.69, date: '2026-05-05', recurring: true },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'mercado',   label: 'Mercado',       color: '#2E7D5B', budget: 1200.00 },
  { id: 'transp',    label: 'Transporte',    color: '#1F4E79', budget:  600.00 },
  { id: 'saude',     label: 'Saúde',         color: '#9F1239', budget:  400.00 },
  { id: 'casa',      label: 'Casa',          color: '#7A4F1D', budget:  500.00 },
  { id: 'lazer',     label: 'Lazer',         color: '#B45309', budget:  350.00 },
  { id: 'educ',      label: 'Educação',      color: '#3F2C7A', budget:  920.00 },
  { id: 'assin',     label: 'Assinaturas',   color: '#0F2D4F', budget:  150.00 },
  { id: 'pessoal',   label: 'Pessoal',       color: '#7A1F3D', budget:  300.00 },
  { id: 'cartao',    label: 'Cartão (pgto)', color: '#475569', budget: 5000.00 },
  { id: 'reserva',   label: 'Reserva S.O.S', color: '#0B6E2F', budget: 1000.00 },
  { id: 'casamento', label: 'Casamento',     color: '#A16207', budget:  800.00 },
];

export const MOCK_FIXED: FixedExpense[] = [
  { id: 'f-clube', label: 'Clubinho almoço',  value: 1300.00, due: 5,  cat: 'mercado', holder: 'shared' },
  { id: 'f-luz',   label: 'Conta de Luz',     value:  550.91, due: 10, cat: 'casa',    holder: 'shared' },
  { id: 'f-alug',  label: 'Aluguel + IPTU',   value:  150.00, due: 10, cat: 'casa',    holder: 'shared' },
  { id: 'f-imp',   label: 'Imposto PJ',       value:  540.00, due: 20, cat: 'casa',    holder: 'Mateus' },
  { id: 'f-hon',   label: 'Honorários',       value:  300.00, due: 20, cat: 'casa',    holder: 'Mateus' },
  { id: 'f-net',   label: 'Internet',         value:  114.90, due: 15, cat: 'assin',   holder: 'shared' },
  { id: 'f-corte', label: 'Corte (Mateus)',   value:   80.00, due: 25, cat: 'pessoal', holder: 'Mateus' },
  { id: 'f-unha',  label: 'Unha (Thais)',     value:   50.00, due: 22, cat: 'pessoal', holder: 'Thais'  },
  { id: 'f-facT',  label: 'Faculdade Thais',  value:  711.45, due: 12, cat: 'educ',    holder: 'Thais'  },
  { id: 'f-facM',  label: 'Faculdade Mateus', value:  202.34, due: 12, cat: 'educ',    holder: 'Mateus' },
];

export const MOCK_GOALS: Goal[] = [
  { id: 'sos',       label: 'Reserva S.O.S', target: 12000, balance:  7500, monthly: 1000, color: '#0B6E2F' },
  { id: 'casamento', label: 'Casamento',     target: 30000, balance: 18420, monthly:  800, color: '#A16207' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1',  date: '2026-05-02', label: 'Combustível Shell',        value:   96.07, cat: 'transp',    holder: 'Mateus', method: 'nu-m', installments: null },
  { id: 't2',  date: '2026-05-02', label: 'Pedágio volta Petrópolis', value:   17.20, cat: 'transp',    holder: 'Mateus', method: 'nu-m', installments: null },
  { id: 't3',  date: '2026-05-03', label: 'Fiação Casa',              value:   17.20, cat: 'casa',      holder: 'shared', method: 'nu-t', installments: { n: 5, of: 7 } },
  { id: 't4',  date: '2026-05-03', label: 'Ar condicionado',          value:  150.00, cat: 'casa',      holder: 'shared', method: 'nu-t', installments: { n: 8, of: 10 } },
  { id: 't5',  date: '2026-05-04', label: 'Blusas Renner',            value:   31.00, cat: 'pessoal',   holder: 'Thais',  method: 'rn-t', installments: null },
  { id: 't6',  date: '2026-05-04', label: 'Super Bom (mercado)',      value:   23.60, cat: 'mercado',   holder: 'shared', method: 'nu-t', installments: null },
  { id: 't7',  date: '2026-05-04', label: 'iCloud',                   value:    5.90, cat: 'assin',     holder: 'Mateus', method: 'nu-t', installments: null, recurring: true },
  { id: 't8',  date: '2026-05-05', label: 'Hortifruti',               value:   66.95, cat: 'mercado',   holder: 'shared', method: 'pp-m', installments: null },
  { id: 't9',  date: '2026-05-06', label: 'Shopee',                   value:   49.90, cat: 'pessoal',   holder: 'Thais',  method: 'pp-m', installments: { n: 1, of: 6 } },
  { id: 't10', date: '2026-05-07', label: 'Spotify Premium',          value:   31.90, cat: 'assin',     holder: 'shared', method: 'it-m', installments: null, recurring: true },
  { id: 't11', date: '2026-05-08', label: 'Salão Casamento',          value:   25.99, cat: 'casamento', holder: 'shared', method: 'nu-t', installments: null },
  { id: 't12', date: '2026-05-09', label: 'Tour Bohemia',             value:  150.00, cat: 'lazer',     holder: 'shared', method: 'nu-t', installments: null },
  { id: 't13', date: '2026-05-10', label: 'Guanabara (mercado)',      value:  125.00, cat: 'mercado',   holder: 'shared', method: 'nu-t', installments: null },
  { id: 't14', date: '2026-05-10', label: 'Assaí viagem',             value:   28.00, cat: 'mercado',   holder: 'shared', method: 'nu-t', installments: null },
  { id: 't15', date: '2026-05-11', label: 'Pedágio ida',              value:   49.25, cat: 'transp',    holder: 'Mateus', method: 'nu-m', installments: null },
  { id: 't16', date: '2026-05-12', label: 'Cortina Sala',             value:   57.15, cat: 'casa',      holder: 'shared', method: 'nu-t', installments: { n: 5, of: 5 } },
  { id: 't17', date: '2026-05-13', label: 'Padaria São Pedro',        value:   11.80, cat: 'mercado',   holder: 'Thais',  method: 'nu-m', installments: null },
  { id: 't18', date: '2026-05-13', label: 'Lanche Rústicos',          value:   58.78, cat: 'lazer',     holder: 'shared', method: 'nu-t', installments: null },
  { id: 't19', date: '2026-05-14', label: 'Localiza (carro)',         value:   43.21, cat: 'transp',    holder: 'Mateus', method: 'it-m', installments: { n: 1, of: 3 } },
  { id: 't20', date: '2026-05-14', label: 'Banho Bento',              value:  377.42, cat: 'pessoal',   holder: 'Thais',  method: 'it-m', installments: null },
  { id: 't21', date: '2026-05-15', label: 'Argola e Gloss',           value:   56.00, cat: 'pessoal',   holder: 'Thais',  method: 'nu-t', installments: null },
  { id: 't22', date: '2026-05-15', label: 'Internet (mês)',           value:   77.90, cat: 'assin',     holder: 'shared', method: 'pp-m', installments: null, recurring: true },
  { id: 't23', date: '2026-05-16', label: 'Amazon',                   value:   23.90, cat: 'pessoal',   holder: 'Mateus', method: 'pp-m', installments: null },
  { id: 't24', date: '2026-05-17', label: 'Super Rede',               value:  117.00, cat: 'mercado',   holder: 'shared', method: 'nu-m', installments: null },
  { id: 't25', date: '2026-05-18', label: 'PG/20 transferência',      value:   10.00, cat: 'pessoal',   holder: 'shared', method: 'nu-m', installments: null },
  { id: 't26', date: '2026-05-19', label: 'Casa Pellegrini',          value:  240.80, cat: 'casa',      holder: 'shared', method: 'rn-t', installments: null },
  { id: 't27', date: '2026-05-19', label: 'Conta de Luz',             value:  550.91, cat: 'casa',      holder: 'shared', method: 'pix',  installments: null, recurring: true },
  { id: 't28', date: '2026-05-20', label: 'Clubinho almoço',          value: 1300.00, cat: 'mercado',   holder: 'shared', method: 'pix',  installments: null, recurring: true },
  { id: 't29', date: '2026-05-20', label: 'Internet residencial',     value:  114.90, cat: 'assin',     holder: 'shared', method: 'pix',  installments: null, recurring: true },
  { id: 't30', date: '2026-05-22', label: 'Reserva S.O.S aporte',    value: 1000.00, cat: 'reserva',   holder: 'shared', method: 'pix',  installments: null, recurring: true },
  { id: 't31', date: '2026-05-22', label: 'Casamento aporte',         value:  800.00, cat: 'casamento', holder: 'shared', method: 'pix',  installments: null, recurring: true },
  { id: 't32', date: '2026-05-23', label: 'Faculdade Thais',          value:  711.45, cat: 'educ',      holder: 'Thais',  method: 'pix',  installments: null, recurring: true },
  { id: 't33', date: '2026-05-23', label: 'Faculdade Mateus',         value:  202.34, cat: 'educ',      holder: 'Mateus', method: 'pix',  installments: null, recurring: true },
];

export const MOCK_HISTORY = [
  { m: 'Jun/25', total: 6890 },
  { m: 'Jul/25', total: 7357 },
  { m: 'Ago/25', total: 8523 },
  { m: 'Set/25', total: 8516 },
  { m: 'Out/25', total: 9230 },
  { m: 'Nov/25', total: 6685 },
  { m: 'Dez/25', total: 8596 },
  { m: 'Jan/26', total: 7036 },
  { m: 'Fev/26', total: 3951 },
  { m: 'Mar/26', total: 3361 },
  { m: 'Abr/26', total: 4791 },
  { m: 'Mai/26', total: 5234 },
];

export const MOCK_INCOME_HISTORY = [
  { m: 'Jun/25', total: 6443 },
  { m: 'Jul/25', total: 6357 },
  { m: 'Ago/25', total: 6298 },
  { m: 'Set/25', total: 6290 },
  { m: 'Out/25', total: 5351 },
  { m: 'Nov/25', total: 7305 },
  { m: 'Dez/25', total: 7477 },
  { m: 'Jan/26', total: 7840 },
  { m: 'Fev/26', total: 6402 },
  { m: 'Mar/26', total: 7799 },
  { m: 'Abr/26', total: 7769 },
  { m: 'Mai/26', total: 7493 },
];

export const CAT_BY = Object.fromEntries(MOCK_CATEGORIES.map(c => [c.id, c]));
export const CARD_BY = Object.fromEntries(MOCK_CARDS.map(c => [c.id, c]));

export const CURRENT_MONTH = { year: 2026, month: 5, label: 'Maio 2026', short: 'Mai/26' };
