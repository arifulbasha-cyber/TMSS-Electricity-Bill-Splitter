
import React, { useState } from 'react';
import { BillConfig, TariffConfig } from '../types';
import { Settings, CreditCard, Banknote, Calendar, Clock, CheckCircle2, Circle, Lock, Save } from 'lucide-react';
import { useLanguage } from '../i18n';

interface BillConfigurationProps {
  config: BillConfig;
  onChange: (key: keyof BillConfig, value: string | number | boolean) => void;
  tariffConfig: TariffConfig;
  onSaveHistory: () => void;
  readOnly?: boolean;
}

const BillConfiguration: React.FC<BillConfigurationProps> = ({ config, onChange, tariffConfig, onSaveHistory, readOnly = false }) => {
  const { t, translateMonth } = useLanguage();
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (key: keyof BillConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (readOnly) return;
    const val = e.target.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;
    onChange(key, val);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (readOnly) return;
    e.target.select();
  };

  const handleInternalSave = () => {
    onSaveHistory();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[2rem] border p-6 transition-all shadow-sm ${readOnly ? 'border-amber-200 dark:border-amber-900/50' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`${readOnly ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/50'} p-2.5 rounded-2xl`}>
            {readOnly ? (
               <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            ) : (
               <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t('costs_configuration')}</h2>
        </div>
        {readOnly ? (
           <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t('local')} VIEW ONLY</span>
        ) : (
           <button 
             onClick={handleInternalSave}
             className={`flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm ${
               isSaved 
                 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' 
                 : 'bg-emerald-600 text-white hover:bg-emerald-700'
             }`}
           >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Saved' : t('save_history')}
           </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className={`col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 gap-4 p-5 rounded-[1.5rem] border ${readOnly ? 'bg-amber-50/20 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'bg-emerald-50/30 dark:bg-slate-800/30 border-emerald-100/50 dark:border-slate-800'}`}>
           <div className="relative group">
            <label className="absolute left-3 top-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('bill_month')}</label>
            <select
              disabled={readOnly}
              value={config.month}
              onChange={handleChange('month')}
              className="w-full h-14 rounded-xl border-b-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold pt-6 pb-2 px-3 focus:border-emerald-500 outline-none transition-all appearance-none disabled:opacity-80"
            >
              {months.map(m => (
                <option key={m} value={m}>{translateMonth(m)}</option>
              ))}
            </select>
          </div>
          <div className="relative group">
            <label className="absolute left-3 top-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('date_generated')}</label>
            <input
              readOnly={readOnly}
              type="date"
              value={config.dateGenerated}
              onChange={handleChange('dateGenerated')}
              className="w-full h-14 rounded-xl border-b-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold pt-6 pb-2 px-3 focus:border-emerald-500 outline-none transition-all color-scheme-dark disabled:opacity-80"
            />
          </div>
        </div>

        <div className="relative group">
          <label className="absolute left-4 top-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('total_bill_payable')}</label>
          <div className="relative flex items-center">
            <input
              readOnly={readOnly}
              type="number"
              min="0"
              value={config.totalBillPayable}
              onChange={handleChange('totalBillPayable')}
              onFocus={handleFocus}
              className={`w-full h-16 rounded-xl border-b-2 bg-slate-50 dark:bg-slate-800/50 text-2xl font-black text-slate-900 dark:text-white pt-7 pb-2 px-4 outline-none transition-all ${readOnly ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500'}`}
            />
            <span className={`absolute right-4 top-8 text-xl font-black ${readOnly ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'}`}>৳</span>
          </div>
        </div>

        <button 
           disabled={readOnly}
           onClick={() => onChange('includeBkashFee', !config.includeBkashFee)}
           className={`h-16 rounded-[1.25rem] px-5 flex items-center gap-3 transition-all ${
             config.includeBkashFee 
               ? (readOnly ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30') 
               : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
           } ${readOnly ? 'cursor-default' : ''}`}
        >
          {config.includeBkashFee ? <CheckCircle2 className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
          <div className="text-left">
             <div className="text-[9px] font-black uppercase tracking-widest opacity-80">{t('bkash_fee')}</div>
             <div className="text-sm font-black leading-none mt-0.5">{config.includeBkashFee ? t('included') : t('not_included')}</div>
          </div>
        </button>

        <button 
           disabled={readOnly}
           onClick={() => onChange('includeLateFee', !config.includeLateFee)}
           className={`h-16 rounded-[1.25rem] px-5 flex items-center gap-3 transition-all ${
             config.includeLateFee 
               ? (readOnly ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30') 
               : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
           } ${readOnly ? 'cursor-default' : ''}`}
        >
          {config.includeLateFee ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          <div className="text-left">
             <div className="text-[9px] font-black uppercase tracking-widest opacity-80">{t('late_fee')}</div>
             <div className="text-sm font-black leading-none mt-0.5">{config.includeLateFee ? t('included') : t('not_included')}</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default BillConfiguration;
