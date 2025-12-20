import React, { useState, useRef } from 'react';
import { MeterReading, Tenant, TariffConfig } from '../types';
import { Users, Trash2, Plus, Zap, Lock, ChevronDown, ChevronUp, AlertTriangle, Settings } from 'lucide-react';
import { useLanguage } from '../i18n';

interface MeterReadingsProps {
  mainMeter: MeterReading;
  onMainMeterUpdate: (reading: MeterReading) => void;
  readings: MeterReading[];
  onUpdate: (readings: MeterReading[]) => void;
  tenants: Tenant[];
  onManageTenants?: () => void;
  maxUnits?: number; 
  calculatedRate?: number;
  tariffConfig?: TariffConfig;
  readOnly?: boolean;
}

const MeterReadings: React.FC<MeterReadingsProps> = ({ 
  mainMeter, onMainMeterUpdate, readings, onUpdate, tenants, onManageTenants, 
  maxUnits = 1, calculatedRate = 0, tariffConfig, readOnly = false
}) => {
  const { t, formatNumber } = useLanguage();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [swipedCardId, setSwipedCardId] = useState<string | null>(null);
  const touchStartRef = useRef<number | null>(null);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedCards);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCards(newSet);
  };
  
  const handleChange = (id: string, key: keyof MeterReading, value: string | number) => {
    if (readOnly) return;
    onUpdate(readings.map(r => r.id === id ? { ...r, [key]: value } : r));
  };

  const handleMainMeterChange = (key: keyof MeterReading, value: string | number) => {
    if (readOnly) return;
    onMainMeterUpdate({ ...mainMeter, [key]: value });
  };

  const onTouchStart = (e: React.TouchEvent, id: string) => {
    if (readOnly) return;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent, id: string) => {
    if (readOnly || touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.targetTouches[0].clientX;
    if (diff > 50) setSwipedCardId(id);
    if (diff < -50) setSwipedCardId(null);
  };

  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">{t('meter_readings')}</h2>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.25em]">{readings.length} ACTIVE SLOTS</span>
        </div>
        {!readOnly && (
            <button 
                onClick={() => {
                  const newId = Date.now().toString();
                  onUpdate([...readings, { id: newId, name: 'New User', meterNo: (readings.length + 1).toString(), previous: 0, current: 0 }]);
                  setExpandedCards(prev => new Set(prev).add(newId));
                }}
                className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-90 transition-all"
            >
                <Plus className="w-6 h-6" />
            </button>
        )}
      </div>

      {/* Obsidian Main Meter Card */}
      <div className="glass-card rounded-[2.5rem] p-6 border-white/10 dark:bg-slate-950/40 relative overflow-hidden group shadow-2xl">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
           <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white border border-white/20">
                    <Lock className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-none mb-1.5 uppercase tracking-wide">{t('main_meter')}</h3>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">UNIT: {formatNumber(mainMeter.meterNo)}</div>
                 </div>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">AGGREGATE</span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{formatNumber(mainMeterUnits)}</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                 <span className="absolute left-4 top-2.5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-500">{t('previous')}</span>
                 <input
                    readOnly={readOnly} type="number" value={mainMeter.previous}
                    onChange={(e) => handleMainMeterChange('previous', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 pt-7 pb-2.5 text-right text-base font-black text-slate-600 dark:text-slate-400 outline-none border border-transparent focus:border-emerald-500/30 transition-all"
                 />
              </div>
              <div className="relative group">
                 <span className="absolute left-4 top-2.5 text-[8px] font-black uppercase tracking-[0.15em] text-emerald-500">{t('current')}</span>
                 <input
                    readOnly={readOnly} type="number" value={mainMeter.current}
                    onChange={(e) => handleMainMeterChange('current', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 pt-7 pb-2.5 text-right text-base font-black text-slate-900 dark:text-white outline-none border border-emerald-500/30 transition-all"
                 />
              </div>
           </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {readings.map((reading) => {
             const units = Math.max(0, reading.current - reading.previous);
             const isExpanded = expandedCards.has(reading.id);
             const isSwiped = swipedCardId === reading.id;
             const estimatedCost = units * calculatedRate;
             const consumptionPercent = maxUnits > 0 ? (units / maxUnits) * 100 : 0;
             
             return (
               <div key={reading.id} className="relative overflow-hidden rounded-[2.5rem]">
                 {!readOnly && (
                    <div className="absolute inset-0 bg-rose-600 flex items-center justify-end pr-10">
                        <Trash2 className="text-white w-6 h-6" />
                    </div>
                 )}
                 
                 <div 
                   className={`glass-card p-0 rounded-[2.5rem] transition-all duration-300 relative z-10 active:scale-[0.98] ${isExpanded ? 'shadow-2xl ring-1 ring-emerald-500/20' : 'shadow-md'}`}
                   style={{ transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)' }}
                   onTouchStart={(e) => onTouchStart(e, reading.id)}
                   onTouchMove={(e) => onTouchMove(e, reading.id)}
                   onTouchEnd={() => { touchStartRef.current = null; }}
                 >
                   <div className="p-6" onClick={() => toggleExpand(reading.id)}>
                      <div className="flex justify-between items-start mb-6 cursor-pointer">
                         <div className="flex items-center gap-4 min-w-0">
                             <div className="min-w-0">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight truncate mb-1">{t(reading.name)}</h3>
                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">MTR: {formatNumber(reading.meterNo)}</div>
                             </div>
                         </div>
                         <div className="text-right">
                             <div className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white leading-none mb-1">৳{formatNumber(Math.round(estimatedCost))}</div>
                             <div className="flex items-center justify-end gap-1.5">
                                <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500/20" />
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{formatNumber(units)} UNIT</span>
                             </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                         <div className="relative">
                            <span className="absolute left-3 top-2 text-[7px] font-black uppercase tracking-[0.2em] text-slate-500">{t('previous')}</span>
                            <input
                               readOnly={readOnly} type="number" value={reading.previous}
                               onChange={(e) => handleChange(reading.id, 'previous', parseFloat(e.target.value) || 0)}
                               onFocus={(e) => e.target.select()}
                               className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-3 pt-5 pb-2 text-right text-sm font-black text-slate-500 outline-none transition-all"
                            />
                         </div>
                         <div className="relative">
                            <span className="absolute left-3 top-2 text-[7px] font-black uppercase tracking-[0.2em] text-emerald-500">{t('current')}</span>
                            <input
                                readOnly={readOnly} type="number" value={reading.current}
                                onChange={(e) => handleChange(reading.id, 'current', parseFloat(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                                className="w-full bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl px-3 pt-5 pb-2 text-right text-sm font-black text-slate-900 dark:text-white outline-none border border-emerald-500/20 transition-all"
                            />
                         </div>
                      </div>
                   </div>

                   {isExpanded && (
                     <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="pt-6 border-t border-black/5 dark:border-white/10 space-y-5">
                           <div className="flex items-center gap-3">
                              <div className="relative flex-1 group">
                                 <select
                                    disabled={readOnly} value={tenants.some(t => t.name === reading.name) ? reading.name : ''}
                                    onChange={(e) => handleChange(reading.id, 'name', e.target.value)}
                                    className="w-full h-14 rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 text-slate-900 dark:text-white text-sm font-semibold pl-5 pr-12 appearance-none focus:ring-2 focus:ring-emerald-500/30 transition-all outline-none"
                                 >
                                    <option value="" disabled>{t('select_tenant')}</option>
                                    {tenants.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                 </select>
                                 <ChevronDown className="absolute right-5 top-5 w-4 h-4 text-slate-500 pointer-events-none" />
                              </div>
                           </div>
                           <div className="flex justify-between items-center">
                              {!readOnly && (
                                <button onClick={() => { if(window.confirm(t('confirm_delete_meter'))) onUpdate(readings.filter(r => r.id !== reading.id)); }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-4 py-2.5 rounded-xl transition-all active:scale-95">
                                    <Trash2 className="w-4 h-4 inline mr-2" /> {t('remove_meter')}
                                </button>
                              )}
                              <button onClick={() => toggleExpand(reading.id)} className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full">
                                 <ChevronUp className="w-5 h-5 text-slate-500" />
                              </button>
                           </div>
                        </div>
                     </div>
                   )}
                   
                   {!isExpanded && (
                     <div className="h-1 w-full bg-black/5 dark:bg-white/5">
                        <div 
                           className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                           style={{ width: `${consumptionPercent}%` }}
                        ></div>
                     </div>
                   )}
                 </div>
               </div>
             );
        })}
      </div>
    </div>
  );
};

export default MeterReadings;