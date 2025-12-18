
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
  mainMeter, 
  onMainMeterUpdate, 
  readings, 
  onUpdate, 
  tenants, 
  onManageTenants, 
  maxUnits = 1,
  calculatedRate = 0,
  tariffConfig,
  readOnly = false
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
    const updated = readings.map(r => r.id === id ? { ...r, [key]: value } : r);
    onUpdate(updated);
  };

  const handleMainMeterChange = (key: keyof MeterReading, value: string | number) => {
    if (readOnly) return;
    onMainMeterUpdate({ ...mainMeter, [key]: value });
  };

  const handleRemove = (id: string) => {
    if (readOnly) return;
    if (window.confirm(t('confirm_delete_meter'))) {
      onUpdate(readings.filter(r => r.id !== id));
    }
  };

  const handleAdd = () => {
    if (readOnly) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const nextMeterNo = readings.length > 0 ? (parseInt(readings[readings.length - 1].meterNo) + 1).toString() : '1';
    const newMeters = [...readings, { id: newId, name: 'New User', meterNo: nextMeterNo, previous: 0, current: 0 }];
    onUpdate(newMeters);
    setExpandedCards(prev => new Set(prev).add(newId));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (readOnly) return;
    e.target.select();
  };

  const onTouchStart = (e: React.TouchEvent, id: string) => {
    if (readOnly) return;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent, id: string) => {
    if (readOnly || touchStartRef.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = touchStartRef.current - currentX;
    if (diff > 50) setSwipedCardId(id);
    if (diff < -50) setSwipedCardId(null);
  };

  const onTouchEnd = () => {
    touchStartRef.current = null;
  };

  const getBarColor = (units: number) => {
    if (!tariffConfig) return 'bg-slate-300';
    const slabs = tariffConfig.slabs;
    if (units <= slabs[0].limit) return 'bg-emerald-500';
    if (units <= slabs[1].limit) return 'bg-teal-500';
    return 'bg-amber-500';
  };

  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);

  const formatMeterDisplay = (val: string) => {
      const num = parseInt(val);
      return isNaN(num) ? val : num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{t('meter_readings')}</h2>
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{readings.length} {t('tenants')}</p>
        </div>
        {!readOnly && (
            <button 
                onClick={handleAdd}
                className="flex items-center gap-1.5 sm:gap-2 bg-emerald-600 dark:bg-emerald-500 text-white px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
                <Plus className="w-4 h-4" /> 
                <span>{t('add_meter')}</span>
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`relative overflow-hidden rounded-[2rem] border p-4 shadow-xl ${readOnly ? 'border-amber-300 dark:border-amber-700 bg-slate-900' : 'border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-slate-950'}`}>
           <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${readOnly ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                    <Lock className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="font-black text-white text-base leading-tight uppercase tracking-wide">{t('main_meter')}</h3>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.1em] mt-0.5">MTR {formatNumber(mainMeter.meterNo)}</div>
                 </div>
              </div>
              <div className="text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-black text-white leading-none font-mono">Total Units</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 text-white ${readOnly ? 'bg-amber-600' : 'bg-emerald-500'}`}>
                        <Zap className="w-3 h-3 fill-current" /> {formatNumber(mainMeterUnits)}
                    </span>
                  </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                 <input
                    readOnly={readOnly}
                    type="number"
                    value={mainMeter.previous}
                    onChange={(e) => handleMainMeterChange('previous', parseFloat(e.target.value) || 0)}
                    onFocus={handleFocus}
                    className="w-full bg-slate-800 border-b border-slate-700 rounded-t-lg px-3 pt-5 pb-1.5 text-right text-[11px] font-bold text-slate-300 outline-none disabled:opacity-80"
                 />
                 <span className="absolute left-3 top-1.5 text-[7px] font-black uppercase tracking-widest text-slate-500">{t('previous')}</span>
              </div>
              <div className="relative">
                 <input
                    readOnly={readOnly}
                    type="number"
                    value={mainMeter.current}
                    onChange={(e) => handleMainMeterChange('current', parseFloat(e.target.value) || 0)}
                    onFocus={handleFocus}
                    className={`w-full bg-slate-800 border-b-2 rounded-t-lg px-3 pt-5 pb-1.5 text-right text-[11px] font-black text-white outline-none disabled:opacity-80 ${readOnly ? 'border-amber-600' : 'border-emerald-500'}`}
                 />
                 <span className={`absolute left-3 top-1.5 text-[7px] font-black uppercase tracking-widest ${readOnly ? 'text-amber-400' : 'text-emerald-400'}`}>{t('current')}</span>
              </div>
           </div>
        </div>

        {readings.map((reading) => {
             const units = Math.max(0, reading.current - reading.previous);
             const isExpanded = expandedCards.has(reading.id);
             const isSwiped = swipedCardId === reading.id;
             const estimatedCost = units * calculatedRate;
             const isNegative = reading.current < reading.previous && reading.current > 0;
             const consumptionPercent = maxUnits > 0 ? (units / maxUnits) * 100 : 0;
             const barColor = getBarColor(units);
             
             return (
               <div key={reading.id} className="relative overflow-hidden rounded-[2rem]">
                 {!readOnly && (
                    <div className="absolute inset-0 bg-rose-600 flex items-center justify-end pr-10">
                        <Trash2 className="text-white w-6 h-6" />
                    </div>
                 )}
                 
                 <div 
                   className={`border p-0 rounded-[2rem] transition-all duration-300 relative z-10 bg-white dark:bg-slate-900 ${isExpanded ? 'shadow-xl ring-2 ring-emerald-500/10' : 'shadow-sm'} ${readOnly ? 'border-amber-200 dark:border-amber-800/60' : 'border-slate-200/60 dark:border-slate-800/60'}`}
                   style={{ transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)' }}
                   onTouchStart={(e) => onTouchStart(e, reading.id)}
                   onTouchMove={(e) => onTouchMove(e, reading.id)}
                   onTouchEnd={onTouchEnd}
                 >
                   <div className="p-4" onClick={() => toggleExpand(reading.id)}>
                      <div className="flex justify-between items-start mb-3 cursor-pointer">
                         <div className="flex items-center gap-2.5 min-w-0">
                             <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-base leading-tight truncate">{t(reading.name)}</h3>
                                    {isNegative && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
                                </div>
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.1em] mt-0.5">MTR {formatNumber(formatMeterDisplay(reading.meterNo))}</div>
                             </div>
                         </div>
                         <div className="text-right">
                             {isNegative ? (
                                <span className="text-[8px] font-black bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full uppercase tracking-wider">{t('negative')}</span>
                             ) : (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-sm font-black text-slate-900 dark:text-white leading-none font-mono">৳{formatNumber(Math.round(estimatedCost))}</span>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${units > 100 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                                      <Zap className="w-3 h-3 fill-current" /> {formatNumber(units)}
                                  </span>
                                </div>
                             )}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                         <div className="relative">
                            <input
                               readOnly={readOnly}
                               type="number"
                               value={reading.previous}
                               onChange={(e) => handleChange(reading.id, 'previous', parseFloat(e.target.value) || 0)}
                               onFocus={handleFocus}
                               className="w-full bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-300 dark:border-slate-700 rounded-t-lg px-3 pt-5 pb-1.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-400 outline-none disabled:opacity-80"
                            />
                            <span className="absolute left-3 top-1.5 text-[7px] font-black uppercase tracking-widest text-slate-400">{t('previous')}</span>
                         </div>
                         <div className="relative">
                            <input
                                readOnly={readOnly}
                                type="number"
                                value={reading.current}
                                onChange={(e) => handleChange(reading.id, 'current', parseFloat(e.target.value) || 0)}
                                onFocus={handleFocus}
                                className={`w-full rounded-t-lg px-3 pt-5 pb-1.5 text-right text-[11px] font-black outline-none disabled:opacity-80 ${readOnly ? 'bg-amber-50/20 dark:bg-amber-900/10 border-b-2 border-amber-300 dark:border-amber-800/50 text-slate-900 dark:text-white' : 'bg-emerald-50/20 dark:bg-emerald-900/10 border-b-2 border-emerald-300 dark:border-emerald-800/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500'}`}
                            />
                            <span className={`absolute left-3 top-1.5 text-[7px] font-black uppercase tracking-widest ${readOnly ? 'text-amber-600' : 'text-emerald-500'}`}>{t('current')}</span>
                         </div>
                      </div>
                   </div>

                   {isExpanded && (
                     <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-4">
                           <div className="flex items-center gap-3">
                              <div className="relative flex-1 group">
                                 <select
                                    disabled={readOnly}
                                    value={tenants.some(t => t.name === reading.name) ? reading.name : ''}
                                    onChange={(e) => handleChange(reading.id, 'name', e.target.value)}
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold pl-4 pr-10 appearance-none focus:ring-2 focus:ring-emerald-500 transition-all outline-none disabled:opacity-80"
                                 >
                                    <option value="" disabled>{t('select_tenant')}</option>
                                    {tenants.map(t => (
                                       <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                 </select>
                                 <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-500 pointer-events-none" />
                              </div>
                              {!readOnly && (
                                <button onClick={onManageTenants} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-emerald-600 transition-all active:scale-90">
                                    <Settings className="w-5 h-5" />
                                </button>
                              )}
                           </div>

                           <div className="flex justify-between items-center pt-1">
                              {!readOnly ? (
                                <button onClick={() => handleRemove(reading.id)} className="text-[9px] font-black text-rose-500 flex items-center gap-2 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg transition-all active:scale-95">
                                    <Trash2 className="w-3.5 h-3.5" /> {t('remove_meter')}
                                </button>
                              ) : (
                                <div></div>
                              )}
                              <button onClick={() => toggleExpand(reading.id)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full transition-all active:scale-90">
                                 <ChevronUp className="w-4 h-4 text-slate-500" />
                              </button>
                           </div>
                        </div>
                     </div>
                   )}
                   
                   {!isExpanded && !isNegative && (
                     <div className="absolute bottom-0 left-0 h-1 bg-slate-200/30 dark:bg-slate-800/30 w-full rounded-b-full overflow-hidden">
                        <div 
                           className={`h-full ${readOnly ? 'bg-amber-500' : barColor} transition-all duration-1000 ease-out`} 
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
