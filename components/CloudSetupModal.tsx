
import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { X, AlertCircle, FileSpreadsheet, Copy, Check } from 'lucide-react';
import { spreadsheetService } from '../services/spreadsheet';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
}

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var payload = data.payload;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === 'saveBill') {
      var sheet = getOrCreateSheet(ss, 'saveBill', ['Timestamp', 'ID', 'Data']);
      sheet.appendRow([new Date(), payload.id, JSON.stringify(payload)]);
      return jsonResponse({ status: 'success' });
    } 
    if (action === 'saveSettings') {
      var sheet = getOrCreateSheet(ss, 'saveSettings', ['Key', 'Data', 'Last Updated']);
      updateOrInsertSetting(sheet, payload.key, JSON.stringify(payload.data));
      return jsonResponse({ status: 'success' });
    }
    return jsonResponse({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === 'getBills') {
      var sheet = ss.getSheetByName('saveBill');
      if (!sheet) return jsonResponse([]);
      var values = sheet.getDataRange().getValues();
      return jsonResponse(values); 
    }
    if (action === 'getSettings') {
      var key = e.parameter.key;
      var sheet = ss.getSheetByName('saveSettings');
      if (!sheet) return jsonResponse(null);
      var data = getSettingByKey(sheet, key);
      return jsonResponse(data ? JSON.parse(data) : null);
    }
    return jsonResponse({ status: 'error' });
  } catch (err) {
    return jsonResponse({ status: 'error' });
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function updateOrInsertSetting(sheet, key, data) {
  var values = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == key) { rowIndex = i + 1; break; }
  }
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 2).setValue(data);
    sheet.getRange(rowIndex, 3).setValue(new Date());
  } else {
    sheet.appendRow([key, data, new Date()]);
  }
}

function getSettingByKey(sheet, key) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == key) return values[i][1];
  }
  return null;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;

const CloudSetupModal: React.FC<CloudSetupModalProps> = ({ isOpen, onClose, onConnected }) => {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isReady = spreadsheetService.isReady();

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async () => {
    setError(null);
    if (!url.startsWith('https://script.google.com/')) {
      setError("Please provide a valid Google Apps Script Web App URL.");
      return;
    }
    
    try {
      spreadsheetService.setConfig({ webAppUrl: url });
      onConnected();
      onClose();
    } catch (e: any) {
      setError("Failed to save configuration.");
    }
  };

  const handleDisconnect = () => {
    if (window.confirm("Disconnect from Google Sheets? Cloud synchronization will be disabled.")) {
      spreadsheetService.clearConfig();
      onConnected();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" /> {t('cloud_setup')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Connect a Google Spreadsheet as your database.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
            <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1 mb-4">
              <li>Create a new Google Spreadsheet.</li>
              <li>Go to Extensions > Apps Script.</li>
              <li>Deploy the required service script as a Web App.</li>
              <li>Set access to "Anyone".</li>
            </ol>
            
            <button 
              onClick={handleCopyCode}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Backend Script'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Web App URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          {isReady && (
            <button onClick={handleDisconnect} className="px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
              Disconnect
            </button>
          )}
          <button 
            disabled={!url.trim()}
            onClick={handleConnect}
            className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {isReady ? 'Update URL' : 'Connect Spreadsheet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSetupModal;
