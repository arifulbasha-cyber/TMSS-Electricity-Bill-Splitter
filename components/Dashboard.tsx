import React, { useState, useRef } from 'react';
import { BillCalculationResult, BillConfig, MeterReading, Tenant, TariffConfig } from '../types';
import { useLanguage } from '../i18n';
import { Zap, Activity, Edit2, Trash2, X, Save, ChevronDown, Hash, User, Lock, CreditCard, Clock, Plus, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  config: BillConfig;
  result: BillCalculationResult;
  mainMeter: MeterReading;
  meters: MeterReading[];
  onUpdateMeters: (meters: MeterReading[]) => void;
  onMainMeterUpdate: (reading: MeterReading) => void;
  onConfigUpdate: (config: BillConfig) => void;
  tenants: Tenant[];
  tariffConfig: TariffConfig;
  onSaveHistory?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ config, result, mainMeter, meters, onUpdateMeters, onMainMeterUpdate, onConfigUpdate, tenants, tariffConfig, onSaveHistory }) => {
  const { t, formatNumber, translateMonth } = useLanguage();
  const [editingMeter, setEditingMeter] = useState<MeterReading | null>(null);
  const [editingMain, setEditingMain] = useState<boolean>(false);
  const [editingTotal, setEditingTotal] = useState<boolean>(false);
  const [tempMain, setTempMain] = useState<MeterReading | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  const [tempTotalBill, setTempTotalBill] = useState<number>(config.totalBillPayable);
  const [tempMonth, setTempMonth] = useState<string>(config.month);
  const [tempDate, setTempDate] = useState<string>(config.dateGenerated);
  const [tempIncludeBkashFee, setTempIncludeBkashFee] = useState<boolean>(config.includeBkashFee);
  const [tempIncludeLateFee, setTempIncludeLateFee] = useState<boolean>(config.includeLateFee);
  
  const touchStartRef = useRef<number | null>(null);
  const touchDiffRef = useRef<number>(0);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);
  const systemLoss = mainMeterUnits - result.totalUnits;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
    touchDiffRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    touchDiffRef.current = touchStartRef.current - e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (id: string | 'main' | 'total') => {
    if (touchDiffRef.current > 80) {
      if (id === 'main') {
        openMainEdit();
      } else if (id === 'total') {
        openTotalEdit();
      } else {
        openEdit(id);
      }
    }
    touchStartRef.current = null;
    touchDiffRef.current = 0;
  };

  const openEdit = (meterId: string) => {
    const meter = meters.find(m => m.id === meterId);
    if (meter) {
      setEditingMeter({ ...meter });
    }
  };

  const openMainEdit = () => {
    setTempMain({ ...mainMeter });
    setEditingMain(true);
  };

  const openTotalEdit = () => {
    setTempTotalBill(config.totalBillPayable);
    setTempMonth(config.month);
    setTempDate(config.dateGenerated);
    setTempIncludeBkashFee(config.includeBkashFee);
    setTempIncludeLateFee(config.includeLateFee);
    setEditingTotal(true);
  };

  const saveEdit = () => {
    if (!editingMeter) return;
    onUpdateMeters(meters.map(m => m.id === editingMeter.id ? editingMeter : m));
    setEditingMeter(null);
  };

  const saveMainEdit = () => {
    if (!tempMain) return;
    onMainMeterUpdate(tempMain);
    setEditingMain(false);
  };

  const saveTotalEdit = () => {
    onConfigUpdate({ 
      ...config, 
      totalBillPayable: tempTotalBill,
      month: tempMonth,
      dateGenerated: tempDate,
      includeBkashFee: tempIncludeBkashFee,
      includeLateFee: tempIncludeLateFee,
      bkashFee: tempIncludeBkashFee ? tariffConfig.bkashCharge : 0
    });
    setEditingTotal(false);
  };

  const handleSaveToHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveHistory) {
      onSaveHistory();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const deleteMeter = (id: string) => {
    if (window.confirm(t('confirm_delete_meter'))) {
      onUpdateMeters(meters.filter(m => m.id !== id));
      setEditingMeter(null);
    }
  };

  const handleAddMeter = () => {
    const newId = Date.now().toString();
    const newMeter: MeterReading = { 
        id: newId, 
        name: 'New User', 
        meterNo: (meters.length + 1).toString(), 
        previous: 0, 
        current: 0 
    };
    onUpdateMeters([...meters, newMeter]);
    setEditingMeter(newMeter);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div 
        className="relative overflow-hidden rounded-[3rem]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => handleTouchEnd('total')}
      >
        <div className="glass-card rounded-[3rem] p-8 shadow-2xl shadow-emerald-500/10 relative overflow-hidden group border border-white/20 active:scale-[0.98] transition-all z-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[80px] -ml-16 -mb-16"></div>
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5 flex-1">
                      <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400/80">{t('total_bill_payable')}</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent"></div>
                    </div>
                    {onSaveHistory && (
                      <button 
                        onClick={handleSaveToHistory}
                        className={`ml-4 flex items-center gap-1.5 px-4 py-2 rounded-2xl transition-all active:scale-90 border border-emerald-500/20 backdrop-blur-md ${
                          isSaved ? 'bg-emerald-500/20 text-emerald-600' : 'bg-white/10 text-emerald-600 dark:text-emerald-400 hover:bg-white/20'
                        }`}
                      >
                        {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        <span className="text-[9px] font-black uppercase tracking-widest">{isSaved ? 'SAVED!' : t('save_history')}</span>
                      </button>
                    )}
                </div>
                
                <div className="flex flex-col">
                    <span className="text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                      ৳{formatNumber(config.totalBillPayable)}
                    </span>
                    <div className="flex items-center gap-3 mt-6">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{translateMonth(config.month)}</span>
                      <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{config.dateGenerated}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-400">{t('main_meter')}</span>
              <div className="h-[0.5px] flex-1 bg-black/5 dark:bg-white/10"></div>
          </div>
          
          <div 
            className="relative overflow-hidden rounded-[2.5rem]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd('main')}
          >
              <div className="glass-card p-8 bg-white dark:bg-slate-900 border border-emerald-500/10 active:scale-[0.98] transition-all relative z-10">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 border border-emerald-600/20 shadow-inner">
                              <Lock className="w-6 h-6" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-none mb-1.5 uppercase tracking-wide">{t('main_meter')}</h3>
                              <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                 <Hash className="w-3 h-3" /> {formatNumber(mainMeter.meterNo)}
                              </div>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none mb-1">{formatNumber(mainMeterUnits)}</div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">KWH AGGREGATE</span>
                      </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2">
                         <Activity className="w-4 h-4 text-emerald-500" />
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('calculated_rate')}</span>
                      </div>
                      <span className="text-xl font-black text-slate-900 dark:text-white">৳{formatNumber(result.calculatedRate.toFixed(2))}</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-400">{t('final_split')}</span>
                <div className="h-[0.5px] flex-1 bg-black/5 dark:bg-white/10"></div>
              </div>
              <button 
                onClick={handleAddMeter}
                className="ml-4 w-10 h-10 bg-emerald-600/10 text-emerald-600 rounded-full flex items-center justify-center active:scale-90 transition-all border border-emerald-600/20"
              >
                <Plus className="w-5 h-5" />
              </button>
          </div>
          
          <div className="space-y-2">
              {result.userCalculations.map((user) => {
                  return (
                      <div 
                        key={user.id} 
                        className="relative overflow-hidden rounded-[2rem]"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleTouchEnd(user.id)}
                      >
                          <div className="relative z-10 bg-white dark:bg-slate-900 active:scale-[0.98] transition-all">
                              <div className="py-6 px-4 flex items-center justify-between bg-transparent border-b border-black/5 dark:border-white/5">
                                  <div className="flex items-center gap-5">
                                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 dark:from-emerald-500/20 dark:to-indigo-500/20 flex items-center justify-center border border-black/5 dark:border-white/10 shadow-sm">
                                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{user.name.substring(0, 2).toUpperCase()}</span>
                                      </div>
                                      <div>
                                          <div className="text-base font-semibold text-slate-900 dark:text-white leading-none mb-2">{t(user.name)}</div>
                                          <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400">{formatNumber(user.unitsUsed)} UNITS</div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-2xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400 leading-none mb-1">৳{formatNumber(Math.round(user.totalPayable))}</div>
                                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">PAYABLE</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>

          <div className="glass-card p-6 rounded-[2.5rem] bg-emerald-500/5 border-emerald-500/10 flex justify-between items-center mt-2">
              <div className="flex items-center gap-3">
                  <div className="bg-emerald-600/10 p-2 rounded-xl">
                      <Zap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('total_user_units')}</span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {formatNumber(result.totalUnits)} <span className="text-[10px] tracking-normal font-medium text-slate-400 ml-0.5">KWH</span>
              </div>
          </div>
      </div>

      <div className="glass-card p-8 rounded-[2.5rem] border-amber-500/10 bg-amber-500/5">
          <div className="flex flex-col items-center text-center">
              <div className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.25em] mb-3">{t('system_loss')}</div>
              <div className={`text-5xl font-black tracking-tighter ${systemLoss > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {formatNumber(systemLoss.toFixed(1))} <span className="text-xs tracking-normal font-medium text-slate-400 ml-1">KWH</span>
              </div>
              <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-4 opacity-60">UNACCOUNTED VARIANCE</div>
          </div>
      </div>

      {editingTotal && (
          <div 
            onClick={() => setEditingTotal(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300"
          >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="glass-card bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/20 animate-in slide-in-from-bottom-4 relative"
              >
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 border border-emerald-600/20 shadow-inner">
                           <Edit2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Bill Details</h3>
                      </div>
                      <button onClick={() => setEditingTotal(false)} className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl active:scale-90 transition-all">
                          <X className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>

                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4 p-2 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-white/5">
                        <div className="relative">
                          <label className="absolute left-4 top-2.5 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('bill_month')}</label>
                          <select
                            value={tempMonth}
                            onChange={(e) => setTempMonth(e.target.value)}
                            className="w-full h-14 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-black pt-5 pb-1 px-4 outline-none appearance-none border border-transparent shadow-sm"
                          >
                            {months.map(m => <option key={m} value={m}>{translateMonth(m)}</option>)}
                          </select>
                        </div>
                        <div className="relative">
                          <label className="absolute left-4 top-2.5 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('date_generated')}</label>
                          <input
                            type="date"
                            value={tempDate}
                            onChange={(e) => setTempDate(e.target.value)}
                            className="w-full h-14 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-black pt-5 pb-1 px-4 outline-none border border-transparent shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button 
                           onClick={() => setTempIncludeBkashFee(!tempIncludeBkashFee)}
                           className={`h-16 rounded-[1.5rem] px-4 flex items-center gap-3 transition-all active:scale-95 border ${
                             tempIncludeBkashFee 
                               ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 border-emerald-500/30' 
                               : 'bg-black/5 dark:bg-white/5 text-slate-400 border-white/5'
                           }`}
                        >
                          <div className={`p-2 rounded-lg ${tempIncludeBkashFee ? 'bg-white/20' : 'bg-black/10 dark:bg-white/5'}`}>
                             <CreditCard className={`w-5 h-5 ${tempIncludeBkashFee ? 'text-white' : 'text-slate-400'}`} />
                          </div>
                          <div className="text-left">
                             <div className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">{t('bkash_fee')}</div>
                             <div className="text-[9px] font-black leading-none">{tempIncludeBkashFee ? t('included') : t('off')}</div>
                          </div>
                        </button>

                        <button 
                           onClick={() => setTempIncludeLateFee(!tempIncludeLateFee)}
                           className={`h-16 rounded-[1.5rem] px-4 flex items-center gap-3 transition-all active:scale-95 border ${
                             tempIncludeLateFee 
                               ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 border-emerald-500/30' 
                               : 'bg-black/5 dark:bg-white/5 text-slate-400 border-white/5'
                           }`}
                        >
                          <div className={`p-2 rounded-lg ${tempIncludeLateFee ? 'bg-white/20' : 'bg-black/10 dark:bg-white/5'}`}>
                             <Clock className={`w-5 h-5 ${tempIncludeLateFee ? 'text-white' : 'text-slate-400'}`} />
                          </div>
                          <div className="text-left">
                             <div className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">{t('late_fee')}</div>
                             <div className="text-[9px] font-black leading-none">{tempIncludeLateFee ? t('included') : t('off')}</div>
                          </div>
                        </button>
                      </div>

                      <div className="relative group">
                        <label className="absolute left-6 top-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] z-10">{t('total_bill_payable')}</label>
                        <div className="relative flex items-center">
                          <input
                            type="number" 
                            value={tempTotalBill}
                            onChange={(e) => setTempTotalBill(parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-full h-20 rounded-[2rem] bg-black/5 dark:bg-white/5 text-4xl font-black text-slate-900 dark:text-white pt-8 pb-3 px-8 outline-none transition-all border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30 shadow-inner"
                          />
                          <span className="absolute right-8 top-10 text-2xl font-black text-emerald-500 drop-shadow-sm">৳</span>
                        </div>
                      </div>

                      <div className="pt-4">
                          <button 
                              onClick={saveTotalEdit}
                              className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                          >
                              <Save className="w-5 h-5" /> {t('save_changes')}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {editingMain && tempMain && (
          <div 
            onClick={() => setEditingMain(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300"
          >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="glass-card bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/20 animate-in slide-in-from-bottom-4 relative"
              >
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 border border-emerald-600/20 shadow-inner">
                           <Lock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Main Meter</h3>
                      </div>
                      <button onClick={() => setEditingMain(false)} className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl active:scale-90 transition-all">
                          <X className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>

                  <div className="space-y-8">
                      <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-[1.25rem] bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/10 shadow-inner">
                             <Zap className="w-7 h-7 text-emerald-600" />
                          </div>
                          <div>
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">{t('main_meter')}</h3>
                             <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Hash className="w-3 h-3" /> METER ID: {formatNumber(tempMain.meterNo)}
                             </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="relative">
                              <span className="absolute left-4 top-2.5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-500">{t('previous')}</span>
                              <input 
                                  type="number"
                                  value={tempMain.previous}
                                  onChange={(e) => setTempMain({ ...tempMain, previous: parseFloat(e.target.value) || 0 })}
                                  className="w-full h-16 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 px-4 pt-6 pb-2 text-right text-base font-black text-slate-600 dark:text-slate-400 outline-none"
                              />
                          </div>
                          <div className="relative">
                              <span className="absolute left-4 top-2.5 text-[8px] font-black uppercase tracking-[0.15em] text-emerald-500">{t('current')}</span>
                              <input 
                                  type="number"
                                  value={tempMain.current}
                                  onChange={(e) => setTempMain({ ...tempMain, current: parseFloat(e.target.value) || 0 })}
                                  className="w-full h-16 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 px-4 pt-6 pb-2 text-right text-base font-black text-slate-900 dark:text-white outline-none"
                              />
                          </div>
                      </div>

                      <div className="pt-6">
                          <button 
                              onClick={saveMainEdit}
                              className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                          >
                              <Save className="w-5 h-5" /> {t('save_changes')}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {editingMeter && (
          <div 
            onClick={() => setEditingMeter(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300"
          >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="glass-card bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/20 animate-in slide-in-from-bottom-4 relative"
              >
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 border border-emerald-600/20 shadow-inner">
                           <Edit2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Edit Reading</h3>
                      </div>
                      <button onClick={() => setEditingMeter(null)} className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl active:scale-90 transition-all">
                          <X className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>

                  <div className="space-y-8">
                      <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-[1.25rem] bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/10 shadow-inner">
                             <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{editingMeter.name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">{t(editingMeter.name)}</h3>
                             <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Hash className="w-3 h-3" /> METER: {formatNumber(editingMeter.meterNo)}
                             </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="relative group">
                              <span className="absolute left-4 top-2.5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-500">{t('previous')}</span>
                              <input 
                                  type="number"
                                  value={editingMeter.previous}
                                  onChange={(e) => setEditingMeter({ ...editingMeter, previous: parseFloat(e.target.value) || 0 })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full h-16 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 px-4 pt-6 pb-2 text-right text-base font-black text-slate-600 dark:text-slate-400 outline-none transition-all"
                              />
                          </div>
                          <div className="relative group">
                              <span className="absolute left-4 top-2.5 text-[8px] font-black uppercase tracking-[0.15em] text-emerald-500">{t('current')}</span>
                              <input 
                                  type="number"
                                  value={editingMeter.current}
                                  onChange={(e) => setEditingMeter({ ...editingMeter, current: parseFloat(e.target.value) || 0 })}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full h-16 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 px-4 pt-6 pb-2 text-right text-base font-black text-slate-900 dark:text-white outline-none transition-all"
                              />
                          </div>
                      </div>

                      <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                             <User className="w-3 h-3" /> {t('user_name')}
                          </label>
                          <div className="relative">
                              <select 
                                  value={editingMeter.name}
                                  onChange={(e) => setEditingMeter({ ...editingMeter, name: e.target.value })}
                                  className="w-full h-14 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 px-5 text-sm font-bold text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                              >
                                  {tenants.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                  {!tenants.some(t => t.name === editingMeter.name) && <option value={editingMeter.name}>{editingMeter.name}</option>}
                              </select>
                              <ChevronDown className="absolute right-4 top-5 w-4 h-4 text-slate-500 pointer-events-none" />
                          </div>
                      </div>

                      <div className="pt-6 space-y-4">
                          <button 
                              onClick={saveEdit}
                              className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                          >
                              <Save className="w-5 h-5" /> {t('save_changes')}
                          </button>
                          <button 
                              onClick={() => deleteMeter(editingMeter.id)}
                              className="w-full h-14 bg-rose-500/10 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all flex items-center justify-center gap-3"
                          >
                              <Trash2 className="w-5 h-5" /> {t('remove_meter')}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;