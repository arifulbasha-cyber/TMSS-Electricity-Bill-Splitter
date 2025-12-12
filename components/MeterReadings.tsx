
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
  
  // Swipe State
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
    // Auto expand new card
    setExpandedCards(prev => new Set(prev).add(newId));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // Swipe Handlers
  const onTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent, id: string) => {
    if (touchStartRef.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = touchStartRef.current - currentX;

    if (diff > 50) setSwipedCardId(id); // Swipe Left
    if (diff < -50) setSwipedCardId(null); // Swipe Right to reset
  };

  const onTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Slab Border Logic
  const getSlabColor = (units: number, isNegative: boolean) => {
     if (isNegative) return 'border-red-400 dark:border-red-700 hover:border-red-500 bg-red-50 dark:bg-red-900/10';
     if (!tariffConfig) return 'border-slate-100 dark:border-slate-700';
     const slabs = tariffConfig.slabs;
     if (units <= slabs[0].limit) return 'border-green-200 dark:border-green-800 hover:border-green-300 shadow-sm shadow-green-100/50 dark:shadow-none';
     if (units <= slabs[1].limit) return 'border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 shadow-sm shadow-yellow-100/50 dark:shadow-none';
     return 'border-orange-200 dark:border-orange-800 hover:border-red-300 shadow-sm shadow-orange-100/50 dark:shadow-none';
  };

  const getBarColor = (units: number) => {
    if (!tariffConfig) return 'bg-slate-300';
    const slabs = tariffConfig.slabs;
    if (units <= slabs[0].limit) return 'bg-green-500';
    if (units <= slabs[1].limit) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const totalUnits = readings.reduce((sum, r) => sum + Math.max(0, r.current - r.previous), 0);
  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);
  const diffUnits = mainMeterUnits - totalUnits;

  // SVG Gauge Calculator
  const gaugeAngle = Math.min(180, (mainMeterUnits / (maxUnits * 1.5 || 200)) * 180);

  // Helper to strip leading zeros for display (e.g. "03" -> "3")
  const formatMeterDisplay = (val: string) => {
      const num = parseInt(val);
      return isNaN(num) ? val : num.toString();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 print-break-inside-avoid transition-colors duration-200">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('meter_readings')}</h2>
        </div>
        <button
          onClick={handleAdd}
          className="no-print flex items-center gap-1 text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t('add_meter')}</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Main Meter Gauge Card */}
        <div className="bg-slate-900 dark:bg-black p-4 rounded-xl border border-slate-700 shadow-lg text-white relative overflow-hidden group">
           {/* Background gradient effect */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
           
           <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                 <div className="bg-indigo-500/20 p-1.5 rounded-lg backdrop-blur-sm">
                    <Lock className="w-4 h-4 text-indigo-300" />
                 </div>
                 <div>
                    <div className="font-bold text-sm uppercase tracking-wide text-slate-200">{t('main_meter')}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Meter {formatNumber(mainMeter.meterNo || '0')}</div>
                 </div>
              </div>
           </div>

           {/* Gauge Visualization */}
           <div className="relative h-32 flex flex-col items-center justify-end mb-2">
               {/* SVG Gauge */}
               <svg viewBox="0 0 200 110" className="w-48 h-28 overflow-visible">
                   {/* Background Arc */}
                   <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
                   {/* Colored Arc (Green to Red Gradient) */}
                   <defs>
                       <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                           <stop offset="0%" stopColor="#22c55e" />
                           <stop offset="50%" stopColor="#eab308" />
                           <stop offset="100%" stopColor="#ef4444" />
                       </linearGradient>
                   </defs>
                   <path 
                      d="M 20 100 A 80 80 0 0 1 180 100" 
                      fill="none" 
                      stroke="url(#gaugeGradient)" 
                      strokeWidth="12" 
                      strokeLinecap="round" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * (gaugeAngle / 180))}
                      className="transition-all duration-1000 ease-out"
                   />
                   {/* Needle */}
                   <g transform={`rotate(${gaugeAngle - 90}, 100, 100)`} className="transition-transform duration-1000 ease-out">
                       <circle cx="100" cy="100" r="4" fill="white" />
                       <path d="M 100 100 L 100 35" stroke="white" strokeWidth="2" strokeLinecap="round" />
                   </g>
                   {/* Text Value */}
                   <text x="100" y="85" textAnchor="middle" fill="white" className="text-3xl font-bold font-mono">{formatNumber(mainMeterUnits)}</text>
                   <text x="100" y="100" textAnchor="middle" fill="#94a3b8" className="text-[10px] uppercase font-bold tracking-widest">Units (kWh)</text>
               </svg>
           </div>
           
           {/* Compact Inputs */}
           <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="relative group/input">
                 <input
                    type="number"
                    value={mainMeter.previous}
                    onChange={(e) => handleMainMeterChange('previous', parseFloat(e.target.value) || 0)}
                    onFocus={handleFocus}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-sm text-slate-300 focus:text-white focus:bg-slate-800 focus:border-indigo-500 outline-none transition-colors"
                 />
                 <span className="absolute left-2 top-2 text-[10px] text-slate-500 uppercase font-bold pointer-events-none">Prev</span>
              </div>
              <div className="relative group/input">
                 <input
                    type="number"
                    value={mainMeter.current}
                    onChange={(e) => handleMainMeterChange('current', parseFloat(e.target.value) || 0)}
                    onFocus={handleFocus}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-sm font-bold text-white focus:bg-slate-800 focus:border-indigo-500 outline-none transition-colors"
                 />
                 <span className="absolute left-2 top-2 text-[10px] text-slate-500 uppercase font-bold pointer-events-none">Curr</span>
              </div>
           </div>
        </div>

        {/* Empty State */}
        {readings.length === 0 && (
           <div className="col-span-1 md:col-span-1 lg:col-span-2 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-3">
                 <Zap className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('no_meters_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 mb-4 max-w-xs">{t('no_meters_desc')}</p>
              <button onClick={handleAdd} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                 {t('add_first_meter')}
              </button>
           </div>
        )}

        {/* Sub Meter Cards (Compact Style) */}
        {readings.map((reading) => {
             const units = Math.max(0, reading.current - reading.previous);
             const matchedTenant = tenants.find(t => t.name === reading.name);
             const isExpanded = expandedCards.has(reading.id);
             const isSwiped = swipedCardId === reading.id;
             const estimatedCost = units * calculatedRate;
             const isNegative = reading.current < reading.previous && reading.current > 0;
             const slabBorderClass = getSlabColor(units, isNegative);
             const consumptionPercent = maxUnits > 0 ? (units / maxUnits) * 100 : 0;
             const barColor = getBarColor(units);
             
             return (
               <div key={reading.id} className="relative overflow-hidden rounded-xl">
                 {/* Swipe Background (Delete) */}
                 <div className="absolute inset-0 bg-red-500 flex items-center justify-center pr-6 rounded-xl justify-end">
                    <Trash2 className="text-white w-6 h-6" />
                 </div>
                 
                 {/* Main Card Content */}
                 <div 
                   className={`bg-white dark:bg-slate-900 border ${slabBorderClass} p-0 rounded-xl transition-transform duration-300 relative z-10 shadow-sm`}
                   style={{ transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)' }}
                   onTouchStart={(e) => onTouchStart(e, reading.id)}
                   onTouchMove={(e) => onTouchMove(e, reading.id)}
                   onTouchEnd={onTouchEnd}
                 >
                   {/* Delete Button (visible on swipe or desktop hover) */}
                   <button
                        onClick={() => handleRemove(reading.id)}
                        className={`absolute top-0 bottom-0 right-[-80px] w-[80px] bg-red-500 flex items-center justify-center text-white z-20 md:hidden`}
                    >
                        <Trash2 className="w-6 h-6" />
                   </button>
                   <button
                        onClick={() => handleRemove(reading.id)}
                        className="hidden md:block absolute top-2 right-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                   >
                        <Trash2 className="w-4 h-4" />
                   </button>

                   {/* Header (Always Visible) */}
                   <div className="pt-3 px-3 pb-2 cursor-pointer relative" onClick={() => toggleExpand(reading.id)}>
                      <div className="flex justify-between items-start relative z-10 mb-2">
                         <div className="flex items-center gap-2.5">
                             {/* Avatar Initials - Smaller */}
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 ${isNegative ? 'bg-red-500' : (units > 100 ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-indigo-400 to-purple-500')}`}>
                                {isNegative ? <AlertTriangle className="w-4 h-4" /> : (reading.name ? reading.name.substring(0, 2).toUpperCase() : '??')}
                             </div>
                             <div className="min-w-0">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{t(reading.name) || t('user_name')}</h3>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-none">Meter {formatNumber(formatMeterDisplay(reading.meterNo))}</div>
                             </div>
                         </div>
                         <div className="text-right shrink-0">
                             {isNegative ? (
                                <div className="text-xs font-bold text-red-500 flex flex-col items-end">
                                    <span>{t('negative_consumption')}</span>
                                </div>
                             ) : (
                                <>
                                  {/* Live Cost Badge - Compact */}
                                  <div className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5 border border-slate-200 dark:border-slate-700 inline-block">
                                      ≈ ৳{formatNumber(Math.round(estimatedCost))}
                                  </div>
                                  <div className={`text-xs font-bold flex items-center justify-end gap-1 leading-tight ${units > 100 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                                      <Zap className="w-3 h-3 fill-current" /> {formatNumber(units)} kWh
                                  </div>
                                </>
                             )}
                         </div>
                      </div>
                   </div>

                   {/* Inputs (Always Visible Now) - Compact Horizontal Style */}
                   <div className="px-3 pb-3 grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                      {/* Previous Input */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1 h-9 group-focus-within:border-indigo-500 relative">
                         <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 mr-1">{t('previous').substring(0,4)}</span>
                         <input
                            type="number"
                            value={reading.previous}
                            onChange={(e) => handleChange(reading.id, 'previous', parseFloat(e.target.value) || 0)}
                            onFocus={handleFocus}
                            className={`w-full bg-transparent border-none p-0 text-right text-sm font-medium text-slate-700 dark:text-slate-300 outline-none leading-tight ${isNegative ? 'text-red-500' : ''}`}
                         />
                      </div>
                      
                      {/* Current Input */}
                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-900/50 px-3 py-1 h-9 shadow-sm group-focus-within:border-indigo-500 relative">
                         <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 mr-1">{t('current').substring(0,4)}</span>
                         <input
                             type="number"
                             value={reading.current}
                             onChange={(e) => handleChange(reading.id, 'current', parseFloat(e.target.value) || 0)}
                             onFocus={handleFocus}
                             className={`w-full bg-transparent border-none p-0 text-right text-sm font-bold text-slate-900 dark:text-white outline-none leading-tight ${isNegative ? 'text-red-500' : ''}`}
                         />
                      </div>
                   </div>

                   {/* Accordion Indicator & Bar */}
                   <div className="relative cursor-pointer" onClick={() => toggleExpand(reading.id)}>
                      {!isExpanded && (
                         <div className="flex justify-center pb-0.5">
                            <ChevronDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                         </div>
                      )}

                      {/* Visual Consumption Bar (Bottom) */}
                      {!isNegative && !isExpanded && (
                        <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-800 w-full">
                           <div 
                              className={`h-full ${barColor} transition-all duration-500 ease-out`} 
                              style={{ width: `${consumptionPercent}%` }}
                           ></div>
                        </div>
                      )}
                   </div>

                   {/* Expandable Content */}
                   {isExpanded && (
                     <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200 relative">
                        {/* Tenant Selection - Compact */}
                        <div className="mb-2 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                           <div className="relative flex-1">
                              <select
                                 value={tenants.some(t => t.name === reading.name) ? reading.name : ''}
                                 onChange={(e) => handleChange(reading.id, 'name', e.target.value)}
                                 className="w-full rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs px-2 py-1.5 appearance-none focus:ring-1 focus:ring-indigo-500 outline-none"
                              >
                                 <option value="" disabled>{t('select_tenant')}</option>
                                 {tenants.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                 ))}
                                 {!tenants.some(t => t.name === reading.name) && reading.name && (
                                    <option value={reading.name}>{reading.name} (Legacy)</option>
                                 )}
                              </select>
                              <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
                           </div>
                           <button onClick={onManageTenants} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title={t('tenant_manager')}>
                              <Settings className="w-3.5 h-3.5" />
                           </button>
                        </div>

                        {/* Negative Warning Message */}
                        {isNegative && (
                            <div className="mt-2 bg-red-50 dark:bg-red-900/20 p-1.5 rounded text-[10px] text-red-600 dark:text-red-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3" />
                                {t('check_readings')}
                            </div>
                        )}

                        <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                           <div className="flex items-center gap-2">
                               <span>Meter {formatNumber(formatMeterDisplay(reading.meterNo))}</span>
                           </div>
                           
                           <span className="md:hidden flex items-center gap-1"><Trash2 className="w-3 h-3" /> {t('swipe_hint')}</span>
                           <div className="flex justify-center" onClick={() => toggleExpand(reading.id)}>
                              <ChevronUp className="w-3 h-3 text-slate-300 cursor-pointer" />
                           </div>
                        </div>
                     </div>
                   )}
                 </div>
               </div>
             );
        })}

        {/* Total Summary Card with Comparison */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 dark:bg-black p-4 rounded-xl text-white shadow-md border border-slate-700 mt-2">
            
            {/* Main Meter Units */}
            <div className="flex flex-col items-center sm:items-start p-2 bg-slate-800 dark:bg-slate-900/50 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('main_meter')}</span>
                <div className="text-lg font-bold font-mono">
                    {formatNumber(mainMeterUnits)} <span className="text-[10px] font-normal text-slate-500">kWh</span>
                </div>
            </div>

            {/* Total Sub Meter Units */}
            <div className="flex flex-col items-center sm:items-start p-2 bg-slate-800 dark:bg-slate-900/50 rounded-lg border border-indigo-900/30">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">{t('total_user_units')}</span>
                <div className="text-lg font-bold font-mono text-indigo-400">
                    {formatNumber(totalUnits)} <span className="text-[10px] font-normal text-indigo-300/50">kWh</span>
                </div>
            </div>

            {/* Difference */}
            <div className="flex flex-col items-center sm:items-start p-2 bg-slate-800 dark:bg-slate-900/50 rounded-lg border border-slate-700">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {diffUnits >= 0 ? t('system_loss') : t('reading_error')}
                 </span>
                 <div className={`text-lg font-bold font-mono flex items-center gap-2 ${diffUnits < 0 ? 'text-red-400' : 'text-orange-400'}`}>
                    {formatNumber(diffUnits)} <span className="text-[10px] font-normal text-slate-500">kWh</span>
                    {diffUnits < 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MeterReadings;
