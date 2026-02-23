
import { Trade, SyncConfig } from '../types';
import { parseCSV } from './storage';

/**
 * Extracts the spreadsheet ID from a standard Google Sheets URL
 */
const extractSheetId = (url: string): string | null => {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

export const fetchTradesFromSheets = async (config: SyncConfig): Promise<Trade[] | null> => {
  if (!config.sheetUrl) return null;
  
  const sheetId = extractSheetId(config.sheetUrl);
  if (!sheetId) return null;

  try {
    // We use the Visualization API endpoint which returns a CSV if the sheet is "Anyone with link can view"
    // This bypasses the need for Apps Script or API Keys for public data.
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
    
    if (!response.ok) {
      throw new Error('Could not fetch sheet data. Ensure the sheet is shared to "Anyone with the link".');
    }
    
    const csvText = await response.text();
    if (!csvText || csvText.length < 10) return [];

    // Reuse the existing robust CSV parser from storage.ts
    const trades = parseCSV(csvText);
    return trades;
  } catch (error) {
    console.error('Sheets Direct Sync Error:', error);
    return null;
  }
};

// We no longer need the APPS_SCRIPT_CODE export, but we'll leave a placeholder for future extension if needed.
export const SYNC_HELP_LINK = "https://docs.google.com/spreadsheets/d/1Xy_Jp_7-id0mG6C_U-D5R78S7eF1v3P5Pz5P5P5P5P5/copy";
