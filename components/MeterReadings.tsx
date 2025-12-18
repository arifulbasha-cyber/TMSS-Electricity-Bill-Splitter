
import React, { useState, useRef } from 'react';
import { MeterReading, Tenant, TariffConfig } from '../types';
import { Users, Trash2, Plus, Zap, Lock, ChevronDown, ChevronUp, AlertTriangle, Settings, Activity } from 'lucide-react';
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
  tariffConfig
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
    const updated = readings.map(r => r.id === id ? { ...r, [key]: value } : r);
    onUpdate(updated);
  };

  const handleMainMeterChange = (key: keyof MeterReading, value: string | number) => {
    onMainMeterUpdate({ ...mainMeter, [key]: value });
  };

  const handleRemove = (id: string) => {
    if (window.confirm(t('confirm_delete_meter'))) {
      onUpdate(readings.filter(r => r.id !== id));
    }
  };

  const handleAdd = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const nextMeterNo = readings.length > 0 ? (parseInt(readings[readings.length - 1].meterNo) + 1).toString() : '1';
    const newMeters = [...readings, { id: newId, name: 'New User', meterNo: nextMeterNo, previous: 0, current: 0 }];
    onUpdate(newMeters);
    setExpandedCards(prev => new Set(prev).add(newId));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const onTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent, id: string) => {
    if (touchStartRef.current === null) return;
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
    if (units <= slabs[1].limit) return 'bg-amber-500';
    return 'bg-orange-500';
  };

  const totalUnits = readings.reduce((sum, r) => sum + Math.max(0, r.current - r.previous), 0);
  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);
  const diffUnits = mainMeterUnits - totalUnits;

  const gaugeAngle = Math.min(180, (mainMeterUnits / (maxUnits * 2 || 300)) * 180);

  const formatMeterDisplay = (val: string) => {
      const num = parseInt(val);
      return isNaN(num) ? val : num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{t('meter_readings')}</h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{readings.length} {t('tenants')}</p>
        </div>
        <button 
          onClick={handleAdd}
          className="hidden sm:flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> {t('add_meter')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Main Meter MD3 Card - Compacted */}
        <div className="bg-slate-900 dark:bg-black p-5 rounded-[2rem] border border-slate-800 shadow-2xl text-white relative overflow-hidden group transition-all">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
           
           <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-3">
                 <div className="bg-indigo-600 p-2 rounded-xl shadow-xl shadow-indigo-600/20">
                    <Lock className="w-4 h-4 text-white" />
                 </div>
                 <div>
                    <div className="font-black text-[9px] uppercase tracking-[0.2em] text-indigo-300/60">{t('main_meter')}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {formatNumber(mainMeter.meterNo || '0')}</div>
                 </div>
              </div>
           </div>

           <div className="relative h-32 flex flex-col items-center justify-end mb-4">
               <svg viewBox="0 0 200 110" className="w-52 h-28 overflow-visible">
                   <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
                   <defs>
                       <linearGradient id="gaugeGradientCompact" x1="0%" y1="0%" x2="100%" y2="0%">
                           <stop offset="0%" stopColor="#10b981" />
                           <stop offset="50%" stopColor="#fbbf24" />
                           <stop offset="100%" stopColor="#f43f5e" />
                       </linearGradient>
                   </defs>
                   <path 
                      d="M 20 100 A 80 80 0 0 1 180 100" 
                      fill="none" 
                      stroke="url(#gaugeGradientCompact)" 
                      strokeWidth="14" 
                      strokeLinecap="round" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * (gaugeAngle / 180))}
                      className="transition-all duration-1000 ease-out"
                   />
                   <text x="100" y="80" textAnchor="middle" fill="white" className="text-3xl font-black font-mono tracking-tighter">{formatNumber(mainMeterUnits)}</text>
                   <text x="100" y="100" textAnchor="middle" fill="#64748b" className="text-[9px] uppercase font-black tracking-[0.3em]">{t('units')}</text>
               </svg>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                 <input
                    type="number"
                    value={mainMeter.previous}
                    onChange={(e) => handleMainMeterChange('previous', parseFloat(e.target.value) || 0)}
                    onFocus={handleFocus}
                    className="w-full bg-slate-800/60 border-b-2 border-slate-700 rounded-t-xl px-3 pt-5 pb-1.5 text-right text-xs font-bold text-slate-300 focus:bg-slate-800 focus:border-indigo-500 outline-none transition-all"
                 />
                 <span className="absolute left-3 top-1.5 text-[7px] text-slate-500 uppercase font-black tracking-widest">{t('previous')}</span>
              </div>
              <div className="relative group">
                 <input
                    type="number"
                    value={mainMeter.current}
                    onChange={(e) => handleMainMeterChange('current', parseFloat(e.target.value) || 0)}
                    onFocus={handleFocus}
                    className="w-full bg-slate-800/60 border-b-2 border-slate-700 rounded-t-xl px-3 pt-5 pb-1.5 text-right text-xs font-black text-white focus:bg-slate-800 focus:border-indigo-500 outline-none transition-all"
                 />
                 <span className="absolute left-3 top-1.5 text-[7px] text-indigo-400/80 uppercase font-black tracking-widest">{t('current')}</span>
              </div>
           </div>
        </div>

        {/* Sub Meter Cards - Compact Neutral Surface Without Initial Block */}
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
                 <div className="absolute inset-0 bg-rose-600 flex items-center justify-end pr-10">
                    <Trash2 className="text-white w-6 h-6" />
                 </div>
                 
                 <div 
                   className={`border border-slate-200/60 dark:border-slate-800/60 p-0 rounded-[2rem] transition-all duration-300 relative z-10 bg-white dark:bg-slate-900 ${isExpanded ? 'shadow-xl ring-2 ring-indigo-500/10' : 'shadow-sm'}`}
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
                               type="number"
                               value={reading.previous}
                               onChange={(e) => handleChange(reading.id, 'previous', parseFloat(e.target.value) || 0)}
                               onFocus={handleFocus}
                               className="w-full bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-300 dark:border-slate-700 rounded-t-lg px-3 pt-5 pb-1.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-400 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 transition-all"
                            />
                            <span className="absolute left-3 top-1.5 text-[7px] font-black uppercase tracking-widest text-slate-400">{t('previous')}</span>
                         </div>
                         <div className="relative">
                            <input
                                type="number"
                                value={reading.current}
                                onChange={(e) => handleChange(reading.id, 'current', parseFloat(e.target.value) || 0)}
                                onFocus={handleFocus}
                                className="w-full bg-indigo-50/20 dark:bg-indigo-900/10 border-b-2 border-indigo-300 dark:border-indigo-800/50 rounded-t-lg px-3 pt-5 pb-1.5 text-right text-[11px] font-black text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 transition-all"
                            />
                            <span className="absolute left-3 top-1.5 text-[7px] font-black uppercase tracking-widest text-indigo-500">{t('current')}</span>
                         </div>
                      </div>
                   </div>

                   {isExpanded && (
                     <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-4">
                           <div className="flex items-center gap-3">
                              <div className="relative flex-1 group">
                                 <select
                                    value={tenants.some(t => t.name === reading.name) ? reading.name : ''}
                                    onChange={(e) => handleChange(reading.id, 'name', e.target.value)}
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold pl-4 pr-10 appearance-none focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                 >
                                    <option value="" disabled>{t('select_tenant')}</option>
                                    {tenants.map(t => (
                                       <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                 </select>
                                 <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-500 pointer-events-none" />
                              </div>
                              <button onClick={onManageTenants} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 transition-all active:scale-90">
                                 <Settings className="w-5 h-5" />
                              </button>
                           </div>

                           <div className="flex justify-between items-center pt-1">
                              <button onClick={() => handleRemove(reading.id)} className="text-[9px] font-black text-rose-500 flex items-center gap-2 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg transition-all active:scale-95">
                                 <Trash2 className="w-3.5 h-3.5" /> {t('remove_meter')}
                              </button>
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
                           className={`h-full ${barColor} transition-all duration-1000 ease-out`} 
                           style={{ width: `${consumptionPercent}%` }}
                        ></div>
                     </div>
                   )}
                 </div>
               </div>
             );
        })}
      </div>

      {/* Summary Section - Surface Tonal Elevation */}
      <div className="bg-slate-100/80 dark:bg-slate-900/60 p-5 rounded-[2rem] space-y-4 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                  <div className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-1 flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> {t('total_user_units')}
                  </div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter">{formatNumber(totalUnits)} <span className="text-[10px] font-bold text-slate-400">kWh</span></div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                  <div className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-1">{t('system_loss')}</div>
                  <div className={`text-xl font-black font-mono tracking-tighter ${diffUnits < 0 ? 'text-rose-500' : 'text-amber-600'}`}>
                    {formatNumber(diffUnits)} <span className="text-[10px] font-bold text-slate-400">kWh</span>
                  </div>
              </div>
              <div className="col-span-2 sm:col-span-1 p-4 bg-indigo-600 dark:bg-indigo-500 rounded-2xl shadow-xl shadow-indigo-600/20 text-white flex flex-col justify-center">
                  <div className="text-[8px] font-black uppercase tracking-[0.15em] mb-1 opacity-70">Rate per Unit</div>
                  <div className="text-xl font-black font-mono tracking-tighter">৳{formatNumber(calculatedRate.toFixed(2))}</div>
              </div>
          </div>
      </div>

      {/* MD3 Floating Action Button (FAB) */}
      <button 
        onClick={handleAdd}
        className="fixed bottom-24 right-6 w-16 h-16 bg-indigo-600 dark:bg-indigo-500 text-white rounded-[1.5rem] shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-105 active:scale-90 sm:hidden"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
};

export default MeterReadings;
