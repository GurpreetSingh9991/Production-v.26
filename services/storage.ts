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

export const parseCSV = (csvText: string): Trade[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const trades: Trade[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 12) continue;

    trades.push({
      id: crypto.randomUUID(),
      accountId: '', 
      timestamp: new Date().toISOString(),
      date: values[0],
      symbol: values[1],
      side: values[2] as Side,
      assetType: 'STOCKS',
      qty: parseFloat(values[3]),
      multiplier: 1,
      entryPrice: parseFloat(values[4]),
      exitPrice: parseFloat(values[5]),
      stopLossPrice: 0,
      targetPrice: 0,
      entryTime: '00:00',
      exitTime: '00:00',
      duration: '0m',
      pnl: parseFloat(values[8]),
      rr: parseFloat(values[13]) || 0,
      result: values[11] as Result,
      resultGrade: values[12] as Grade,
      narrative: values[14]?.replace(/^"|"$/g, '') || '',
      chartLink: '',
      setupType: values[10] || 'A',
      weeklyBias: 'SIDEWAYS',
      executions: [],
      mistakes: [],
      psychology: { moodBefore: 3, moodAfter: 3, states: [], notes: '' }
    });
  }
  return trades;
};