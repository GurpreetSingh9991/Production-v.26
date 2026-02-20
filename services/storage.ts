import { Trade, Side, Result, Grade, Bias, AssetType } from '../types';

const STORAGE_KEY = 'precision_trader_journal_data';

export const saveTrades = (trades: Trade[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
};

export const loadTrades = (): Trade[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse trade data", e);
    return [];
  }
};

const CSV_COLUMNS = [
  'Date', 'Symbol', 'Side', 'Qty', 'Entry Price', 'Exit Price', 
  'Gross P&L', 'Fees', 'Net P&L', 'Tags', 'Setup Type', 'Result', 
  'Grade', 'RR', 'Narrative'
];

export const exportToCSV = (trades: Trade[]) => {
  if (trades.length === 0) return;
  
  const headers = CSV_COLUMNS.join(',');
  const rows = trades.map(t => {
    // Calculate gross if missing
    const fees = t.total_fees || 0;
    const gross = t.gross_pnl ?? (t.pnl + fees);
    const tagsString = (t.tags || []).join('; ');
    const escapedNarrative = (t.narrative || '').replace(/"/g, '""');

    return [
      t.date,
      t.symbol,
      t.side,
      t.qty,
      t.entryPrice,
      t.exitPrice,
      gross.toFixed(2),
      fees.toFixed(2),
      t.pnl.toFixed(2),
      `"${tagsString.replace(/"/g, '""')}"`,
      t.setupType,
      t.result,
      t.resultGrade,
      t.rr,
      `"${escapedNarrative}"`
    ].join(',');
  });
  
  const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + "\n" + rows.join('\n'));
  const link = document.createElement("a");
  const fileNameDate = new Date().toISOString().split('T')[0];
  link.setAttribute("href", csvContent);
  link.setAttribute("download", `trades_${fileNameDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const COLUMN_ALIASES: Record<string, string> = {
  'date': 'date', 'time': 'date', 'trade date': 'date', 'close date': 'date', 'open date': 'date',
  'symbol': 'symbol', 'instrument': 'symbol', 'ticker': 'symbol', 'market': 'symbol', 'contract': 'symbol',
  'side': 'side', 'direction': 'side', 'type': 'side', 'position': 'side', 'action': 'side', 'buy/sell': 'side',
  'qty': 'qty', 'quantity': 'qty', 'shares': 'qty', 'size': 'qty', 'contracts': 'qty', 'volume': 'qty',
  'entry price': 'entryPrice', 'entry': 'entryPrice', 'open price': 'entryPrice', 'avg entry': 'entryPrice', 'buy price': 'entryPrice', 'avg. entry price': 'entryPrice',
  'exit price': 'exitPrice', 'exit': 'exitPrice', 'close price': 'exitPrice', 'avg exit': 'exitPrice', 'sell price': 'exitPrice', 'avg. exit price': 'exitPrice',
  'net p&l': 'pnl', 'pnl': 'pnl', 'p&l': 'pnl', 'profit/loss': 'pnl', 'net profit': 'pnl', 'realized p&l': 'pnl', 'net p/l': 'pnl', 'amount': 'pnl', 'gain/loss': 'pnl',
  'setup type': 'setupType', 'setup': 'setupType', 'strategy': 'setupType',
  'grade': 'resultGrade', 'rating': 'resultGrade', 'score': 'resultGrade',
  'notes': 'narrative', 'narrative': 'narrative', 'comments': 'narrative', 'description': 'narrative',
  'tags': 'tags', 'label': 'tags', 'labels': 'tags',
  'rr': 'rr', 'r:r': 'rr', 'risk/reward': 'rr', 'r multiple': 'rr',
  'fees': 'total_fees', 'commission': 'total_fees', 'fee': 'total_fees', 'commissions': 'total_fees',
};

const normalizeSide = (val: string): 'LONG' | 'SHORT' => {
  const v = (val || '').toUpperCase().trim();
  if (['BUY', 'LONG', 'BOT', 'B', 'BOUGHT'].includes(v)) return 'LONG';
  if (['SELL', 'SHORT', 'SLD', 'S', 'SOLD'].includes(v)) return 'SHORT';
  return 'LONG';
};

export const parseCSV = (csvText: string, accountId: string = ''): Trade[] => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(',').map(h =>
    h.trim().toLowerCase().replace(/^["'\uFEFF]+|["']+$/g, '')
  );

  const colIndex: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    const mapped = COLUMN_ALIASES[h];
    if (mapped && !(mapped in colIndex)) {
      colIndex[mapped] = i;
    }
  });

  const required = ['date', 'symbol', 'pnl'];
  const missing = required.filter(r => !(r in colIndex));
  if (missing.length > 0) {
    throw new Error(
      `Could not find required columns: ${missing.join(', ')}.\n` +
      `Found headers: ${rawHeaders.slice(0, 8).join(', ')}...\n` +
      `Your CSV needs at least: Date, Symbol, and P&L (or Net P&L) columns.`
    );
  }

  const getCell = (row: string[], field: string, fallback = ''): string => {
    const idx = colIndex[field];
    if (idx === undefined || idx >= row.length) return fallback;
    return (row[idx] || fallback).trim().replace(/^["']|["']$/g, '');
  };

  const parseNum = (val: string): number => {
    const cleaned = val.replace(/[$,\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const trades: Trade[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted CSV fields properly
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { row.push(current); current = ''; }
      else { current += char; }
    }
    row.push(current);
    if (row.length < 3) continue;

    const pnlRaw = parseNum(getCell(row, 'pnl', '0'));
    if (isNaN(pnlRaw) && getCell(row, 'symbol') === '') continue;

    const entryPrice = parseNum(getCell(row, 'entryPrice', '0'));
    const exitPrice  = parseNum(getCell(row, 'exitPrice',  '0'));
    const qty        = parseNum(getCell(row, 'qty', '1')) || 1;
    const rr         = parseNum(getCell(row, 'rr',  '0'));
    const fees       = parseNum(getCell(row, 'total_fees', '0'));
    const result: Result = pnlRaw > 0 ? 'WIN' : pnlRaw < 0 ? 'LOSS' : 'BE';

    const rawDate = getCell(row, 'date', new Date().toISOString().split('T')[0]);
    // Normalize date to YYYY-MM-DD
    let normalizedDate = rawDate;
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        normalizedDate = d.toISOString().split('T')[0];
      }
    } catch { /* keep raw */ }

    trades.push({
      id: crypto.randomUUID(),
      accountId,
      timestamp: new Date().toISOString(),
      date: normalizedDate,
      symbol: getCell(row, 'symbol', 'UNKNOWN').toUpperCase(),
      side: normalizeSide(getCell(row, 'side', 'LONG')),
      assetType: 'STOCKS',
      qty,
      multiplier: 1,
      entryPrice,
      exitPrice,
      stopLossPrice: 0,
      targetPrice: 0,
      entryTime: '09:30',
      exitTime: '16:00',
      duration: '0m',
      pnl: pnlRaw,
      rr,
      result,
      resultGrade: (getCell(row, 'resultGrade', 'B') as Grade) || 'B',
      setupType: getCell(row, 'setupType', 'A') || 'A',
      weeklyBias: 'SIDEWAYS',
      narrative: getCell(row, 'narrative', ''),
      chartLink: '',
      tags: getCell(row, 'tags') ? getCell(row, 'tags').split(';').map((t: string) => t.trim()).filter(Boolean) : [],
      total_fees: fees,
      gross_pnl: pnlRaw + fees,
      net_pnl: pnlRaw,
      executions: [],
      mistakes: [],
      psychology: { moodBefore: 3, moodAfter: 3, states: [], notes: '' },
      followedPlan: true,
      plan: '',
    });
  }
  return trades;
};
