
import { SavedBill, TariffConfig, Tenant, DraftData, SpreadsheetConfig } from '../types';

class SpreadsheetService {
  private config: SpreadsheetConfig | null = null;

  constructor() {
    const saved = localStorage.getItem('tmss_spreadsheet_config');
    if (saved) {
      try {
        this.config = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load spreadsheet config");
      }
    }
  }

  public isReady(): boolean {
    return !!this.config && !!this.config.webAppUrl;
  }

  public setConfig(config: SpreadsheetConfig) {
    this.config = config;
    localStorage.setItem('tmss_spreadsheet_config', JSON.stringify(config));
  }

  public clearConfig() {
    this.config = null;
    localStorage.removeItem('tmss_spreadsheet_config');
  }

  private async request(action: string, payload?: any, method: 'GET' | 'POST' = 'POST') {
    if (!this.config) throw new Error("Cloud sync not configured");

    const url = new URL(this.config.webAppUrl);
    if (method === 'GET') {
      url.searchParams.append('action', action);
      if (payload && typeof payload === 'string') {
        url.searchParams.append('key', payload);
      }
    }

    const options: RequestInit = {
      method,
      mode: 'cors',
      // Apps Script redirects to a temporary URL which requires 'follow'
      redirect: 'follow', 
    };

    if (method === 'POST') {
      options.body = JSON.stringify({ action, payload });
      // Using text/plain is a common trick to avoid pre-flight OPTIONS requests 
      // which Google Apps Script doesn't always handle well.
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    }

    try {
      const response = await fetch(url.toString(), options);
      
      // If the response is not JSON (e.g. an HTML error page from Google)
      // we need to see the raw text to debug.
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Non-JSON response from Apps Script:", responseText);
        throw new Error("Cloud service returned an invalid response. Check console for details.");
      }

      if (data && data.status === 'error') {
        throw new Error(data.message || "Cloud sync error");
      }

      return data;
    } catch (err) {
      console.error("Spreadsheet Sync Failed:", err);
      throw err;
    }
  }

  public async saveBill(bill: SavedBill) {
    return this.request('saveBill', bill);
  }

  public async saveHistory(bills: SavedBill[]) {
    return this.request('saveHistory', bills);
  }

  public async getBills(): Promise<SavedBill[]> {
    try {
      const rows = await this.request('getBills', null, 'GET');
      if (!Array.isArray(rows) || rows.length <= 1) return [];
      
      // rows[0] is headers ['Timestamp', 'ID', 'Data']
      return rows.slice(1).map((r: any[]) => {
        try {
          return JSON.parse(r[2]);
        } catch (e) {
          return null;
        }
      }).filter(b => b !== null) as SavedBill[];
    } catch (e) {
      console.error("Failed to fetch bills from spreadsheet", e);
      return [];
    }
  }

  public async saveTariff(config: TariffConfig) {
    return this.request('saveSettings', { key: 'tariff', data: config });
  }

  public async getTariff(): Promise<TariffConfig | null> {
    return this.request('getSettings', 'tariff', 'GET');
  }

  public async saveTenants(tenants: Tenant[]) {
    return this.request('saveSettings', { key: 'tenants', data: tenants });
  }

  public async getTenants(): Promise<Tenant[]> {
    const data = await this.request('getSettings', 'tenants', 'GET');
    return Array.isArray(data) ? data : [];
  }

  public async saveDraft(draft: DraftData) {
    return this.request('saveSettings', { key: 'draft', data: draft });
  }

  public async getDraft(): Promise<DraftData | null> {
    return this.request('getSettings', 'draft', 'GET');
  }
}

export const spreadsheetService = new SpreadsheetService();
