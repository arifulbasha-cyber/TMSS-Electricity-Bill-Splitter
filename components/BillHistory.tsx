
import React from 'react';
import { SavedBill } from '../types';
import { History, RotateCcw, Trash2, Calendar } from 'lucide-react';
import { useLanguage } from '../i18n';

interface BillHistoryProps {
  history: SavedBill[];
  onLoad: (bill: SavedBill) => void;
  onDelete: (id: string) => void;
}

const BillHistory: React.FC<BillHistoryProps> = ({ history, onLoad, onDelete }) => {
  const { t } = useLanguage();
  if (history.length === 0) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-'); // Expecting yyyy-mm-dd
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${parseInt(day)}/${parseInt(month)}/${year.slice(-2)}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 print-break-inside-avoid no-print transition-colors duration-200">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('bill_history')}</h2>
      </div>
      <div className="space-y-3">
        {history.map((bill) => (
          <div key={bill.id} className="group p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">{bill.config.month}</h4>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(bill.config.dateGenerated)}
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                ৳{bill.config.totalBillPayable}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => onLoad(bill)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> {t('restore')}
              </button>
              <button
                onClick={() => onDelete(bill.id)}
                className="flex items-center justify-center gap-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-red-600 dark:text-red-400 py-1.5 px-3 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-colors"
                title={t('delete')}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right mt-1">
              {t('saved_at')} {new Date(bill.savedAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillHistory;
