import type { DailyCategory } from '@/types/finance';

export interface ImportedTransaction {
  key: string; // used to detect duplicates
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive = expense
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function makeKey(date: string, description: string, amount: number) {
  return `${date}|${norm(description)}|${amount.toFixed(2)}`;
}

function parseBRNumber(raw: string): number {
  let s = raw.replace(/R\$|\s|"/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

function parseBRDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

function splitLine(line: string, d: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === d && !q) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const IGNORE = /pagamento (de )?fatura|pagto fatura|pagamento efetuado|estorno|credito de/i;

export function parseCSV(text: string): ImportedTransaction[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  const hIdx = lines.findIndex(l => /data/i.test(l) && /valor/i.test(l));
  if (hIdx < 0) throw new Error('Não encontrei as colunas "Data" e "Valor" no arquivo.');
  const header = lines[hIdx];
  const d = header.split(';').length > header.split(',').length ? ';' : ',';
  const cols = splitLine(header, d).map(norm);
  const iDate = cols.findIndex(c => c.startsWith('data'));
  const iVal = cols.findIndex(c => c === 'valor' || c.startsWith('valor'));
  let iDesc = cols.findIndex(c => /descricao|lancamento|historico|estabelecimento/.test(c) && !c.startsWith('data'));
  if (iDesc < 0) iDesc = cols.findIndex((_, i) => i !== iDate && i !== iVal);

  const rows = lines.slice(hIdx + 1).map(l => {
    const c = splitLine(l, d);
    return { date: parseBRDate(c[iDate] || ''), description: c[iDesc] || 'Sem descrição', value: parseBRNumber(c[iVal] || '') };
  }).filter(r => r.date && !isNaN(r.value)) as { date: string; description: string; value: number }[];

  // Bank statement: expenses are negative. Card bill: purchases are positive.
  const hasNegative = rows.some(r => r.value < 0);
  return rows
    .filter(r => (hasNegative ? r.value < 0 : r.value > 0) && !IGNORE.test(r.description))
    .map(r => {
      const amount = Math.abs(r.value);
      return { date: r.date, description: r.description, amount, key: makeKey(r.date, r.description, amount) };
    });
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'));
  return m ? m[1].trim() : '';
}

export function parseOFX(text: string): ImportedTransaction[] {
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  if (!blocks.length) throw new Error('Nenhuma transação encontrada no arquivo OFX.');
  return blocks.map(b => {
    const dt = tag(b, 'DTPOSTED');
    const date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
    const value = parseBRNumber(tag(b, 'TRNAMT').replace('.', ','));
    const description = tag(b, 'MEMO') || tag(b, 'NAME') || 'Sem descrição';
    return { date, description, value };
  })
    .filter(r => r.value < 0 && !IGNORE.test(r.description))
    .map(r => {
      const amount = Math.abs(r.value);
      return { date: r.date, description: r.description, amount, key: makeKey(r.date, r.description, amount) };
    });
}

export function parseBankFile(name: string, text: string): ImportedTransaction[] {
  return /\.ofx$/i.test(name) || /<OFX>/i.test(text) ? parseOFX(text) : parseCSV(text);
}

// Remember category per merchant
const MEMO_KEY = 'finance-import-categories';
export function suggestCategory(description: string): DailyCategory {
  try {
    const map = JSON.parse(localStorage.getItem(MEMO_KEY) || '{}');
    if (map[norm(description)]) return map[norm(description)];
  } catch { /* ignore */ }
  const d = norm(description);
  if (/ifood|mcdonald|burger|lanche|pizza|doceria/.test(d)) return 'besteira';
  if (/restaurante|almoco|marmita/.test(d)) return 'almoco';
  if (/mercado|supermerc|atacad|padaria|hortifruti/.test(d)) return 'alimentacao';
  if (/posto|combust|shell|ipiranga|uber|99/.test(d)) return 'carro';
  if (/farmacia|drogaria|droga/.test(d)) return 'saude';
  if (/pet|cobasi|petz/.test(d)) return 'tiriri';
  if (/netflix|spotify|cinema|ingresso/.test(d)) return 'lazer';
  return 'outros';
}
export function rememberCategory(description: string, category: DailyCategory) {
  try {
    const map = JSON.parse(localStorage.getItem(MEMO_KEY) || '{}');
    map[norm(description)] = category;
    localStorage.setItem(MEMO_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}
