import React, { useState } from 'react';
import { Calculator, Zap, Info, Banknote, ChevronRight, Activity, ArrowDownRight, Layers, ClipboardCheck } from 'lucide-react';
import { useLanguage } from '../i18n';
import { TariffConfig } from '../types';

interface SubStep {
  label: string;
  text: string;
  calculation: string;
  note?: string;
}

interface LogicStep {
  title: string;
  description: string;
  subSteps: SubStep[];
  tableHeader?: boolean;
}

interface BillEstimatorProps {
    tariffConfig: TariffConfig;
}

const BillEstimator: React.FC<BillEstimatorProps> = ({ tariffConfig }) => {
  const { t, formatNumber } = useLanguage();
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [units, setUnits] = useState<number | string>('');
  const [targetBill, setTargetBill] = useState<number | string>('');

  const DEMAND_CHARGE = tariffConfig.demandCharge;
  const METER_RENT = tariffConfig.meterRent;
  const VAT_RATE = tariffConfig.vatRate;
  const SLABS = tariffConfig.slabs;

  const calculateBill = (u: number) => {
    let remainingUnits = u;
    let energyCost = 0;
    let previousLimit = 0;

    for (const slab of SLABS) {
      const slabSize = slab.limit - previousLimit;
      const unitsInSlab = Math.min(remainingUnits, slabSize);
      
      if (unitsInSlab > 0) {
        energyCost += unitsInSlab * slab.rate;
        remainingUnits -= unitsInSlab;
      }
      previousLimit = slab.limit;
      if (remainingUnits <= 0) break;
    }

    if (remainingUnits > 0 && SLABS.length > 0) {
        const lastRate = SLABS[SLABS.length - 1].rate;
        energyCost += remainingUnits * lastRate;
    }

    const totalSubjectToVat = energyCost + DEMAND_CHARGE + METER_RENT;
    const vatAmount = totalSubjectToVat * VAT_RATE;
    const totalPayable = totalSubjectToVat + vatAmount;

    return {
      energyCost,
      totalSubjectToVat,
      vatAmount,
      totalPayable
    };
  };

  const calculateUnitsDetailed = (bill: number) => {
    const vatAmount = (bill * VAT_RATE) / (1 + VAT_RATE);
    const taxableBase = bill - vatAmount;
    const energyCost = taxableBase - (DEMAND_CHARGE + METER_RENT);

    const logicSteps: LogicStep[] = [];

    logicSteps.push({
        title: t('step1_title'),
        description: t('step1_desc'),
        subSteps: [
            {
                label: t('step1a_label'),
                text: t('step1a_text'),
                calculation: `VAT = (${bill.toFixed(2)} × ${VAT_RATE}) ÷ ${(1 + VAT_RATE).toFixed(2)} = ${vatAmount.toFixed(2)}\nBase = ${bill.toFixed(2)} - ${vatAmount.toFixed(2)} = ${taxableBase.toFixed(2)}`
            },
            {
                label: t('step1b_label'),
                text: t('step1b_text'),
                calculation: `${taxableBase.toFixed(2)} - ${(DEMAND_CHARGE + METER_RENT).toFixed(2)} = ${energyCost.toFixed(2)}`
            }
        ]
    });

    let remainingCost = energyCost;
    let totalUnits = 0;
    let previousLimit = 0;
    const slabSubSteps: SubStep[] = [];
    
    if (energyCost > 0) {
      for (let i = 0; i < SLABS.length; i++) {
          const slab = SLABS[i];
          const slabSize = slab.limit - previousLimit;
          const maxCostForSlab = slabSize * slab.rate;
          const stepBase = { slabIndex: i + 1, range: `${previousLimit}-${slab.limit}`, rate: slab.rate, startCost: remainingCost };

          if (remainingCost >= maxCostForSlab) {
              totalUnits += slabSize;
              remainingCost -= maxCostForSlab;
              slabSubSteps.push({
                  label: `${t('test_slab')} ${stepBase.slabIndex}`,
                  text: t('test_slab_text'),
                  calculation: `${stepBase.startCost.toFixed(2)} - ${maxCostForSlab.toFixed(2)} = ${remainingCost.toFixed(2)}`,
                  note: `Since remaining cost (${remainingCost.toFixed(2)}) is > 0, consumption is over ${slab.limit} units.`
              });
          } else {
              const unitsInSlab = remainingCost / slab.rate;
              totalUnits += unitsInSlab;
              slabSubSteps.push({
                  label: `${t('calc_slab')} (${t('test_slab')} ${stepBase.slabIndex})`,
                  text: t('calc_slab_text'),
                  calculation: `${stepBase.startCost.toFixed(2)} / ${slab.rate} = ${unitsInSlab.toFixed(2)} ${t('units')}`
              });
              remainingCost = 0;
              break;
          }
          previousLimit = slab.limit;
      }
      
      if (remainingCost > 0.01 && SLABS.length > 0) {
           const lastRate = SLABS[SLABS.length - 1].rate;
           const extraUnits = remainingCost / lastRate;
           totalUnits += extraUnits;
           slabSubSteps.push({
              label: t('above_slab_limit'),
              text: t('above_slab_text'),
              calculation: `${remainingCost.toFixed(2)} / ${lastRate} = ${extraUnits.toFixed(2)} ${t('units')}`
           });
      }
    } else {
        slabSubSteps.push({
            label: t('no_usage'),
            text: t('no_usage_text'),
            calculation: "0 units"
        });
    }

    logicSteps.push({
        title: t('step2_title'),
        description: t('step2_desc'),
        tableHeader: true,
        subSteps: slabSubSteps
    });
    
    logicSteps.push({
        title: t('step3_title'),
        description: t('step3_desc'),
        subSteps: [{
            label: t('final_sum'),
            text: t('final_sum_text'),
            calculation: `= ${totalUnits.toFixed(2)} kWh`
        }]
    });

    return { totalUnits, logicSteps, energyCost, taxableBase };
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const currentUnits = typeof units === 'number' ? units : 0;
  const forwardResult = calculateBill(currentUnits);
  const reverseResult = calculateUnitsDetailed(typeof targetBill === 'number' ? targetBill : 0);

  const renderSlabBar = () => {
     if (mode !== 'forward') return null;
     
     let currentSlabIdx = -1;
     let prevLimit = 0;
     for(let i=0; i<SLABS.length; i++) {
        if (currentUnits > prevLimit && currentUnits <= SLABS[i].limit) {
           currentSlabIdx = i;
           break;
        }
        prevLimit = SLABS[i].limit;
     }
     if (currentSlabIdx === -1 && currentUnits > 0) currentSlabIdx = SLABS.length; 

     const colors = ['bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-teal-500', 'bg-teal-600'];

     return (
        <div className="mb-8 p-6 rounded-[2.5rem] bg-black/5 dark:bg-white/5 border border-white/10 shadow-inner">
           <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{t('current_tier')}</span>
              <div className="flex items-center gap-2">
                 <Zap className="w-3.5 h-3.5 text-emerald-500" />
                 <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                    {formatNumber(currentUnits)} <span className="text-[10px] font-medium tracking-normal text-slate-500">kWh</span>
                 </span>
              </div>
           </div>
           
           <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              {SLABS.map((slab, idx) => {
                 const isActive = idx === currentSlabIdx || (idx === SLABS.length -1 && currentSlabIdx >= idx);
                 const isPassed = idx < currentSlabIdx;
                 
                 return (
                    <div 
                      key={idx} 
                      className={`flex-1 border-r border-white/10 last:border-0 relative transition-all duration-500 ${isPassed ? colors[idx % colors.length] : (isActive ? colors[idx % colors.length] + ' shadow-[0_0_20px_rgba(16,185,129,0.3)] z-10' : 'bg-slate-300 dark:bg-slate-700/50')}`}
                    >
                        {isActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                    </div>
                 );
              })}
              <div className={`flex-1 relative ${currentSlabIdx >= SLABS.length ? 'bg-emerald-800' : 'bg-slate-300 dark:bg-slate-700/50'}`}></div>
           </div>
           
           <div className="flex justify-between mt-2 px-1 text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">
              <span>0</span>
              {SLABS.map((s,i) => <span key={i}>{s.limit}</span>)}
              <span>+</span>
           </div>
           
           {currentUnits > 0 && (
             <div className="mt-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Current Tier Rate: <span className="font-black text-xs mx-1">৳{formatNumber(currentSlabIdx < SLABS.length ? SLABS[currentSlabIdx]?.rate : SLABS[SLABS.length-1]?.rate)}</span> per unit
             </div>
           )}
        </div>
     );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="glass-card rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600/20 p-3 rounded-2xl border border-emerald-500/20 backdrop-blur-md">
                <Calculator className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">{t('bill_estimator')}</h2>
                <div className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.25em]">SIMULATION ENGINE v2</div>
              </div>
            </div>
            
            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md self-start sm:self-center">
              <button
                onClick={() => setMode('forward')}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                  mode === 'forward' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xl scale-105' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> {t('units')}
              </button>
              <button
                onClick={() => setMode('reverse')}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                  mode === 'reverse' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xl scale-105' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" /> {t('cost')}
              </button>
            </div>
          </div>

          {mode === 'forward' ? (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="relative group">
                <label className="absolute left-6 top-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] z-10">
                  {t('enter_units_used')}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number" min="0" value={units}
                    onChange={(e) => setUnits(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    onFocus={handleFocus}
                    className="w-full h-24 rounded-[2rem] bg-black/5 dark:bg-white/5 text-5xl font-black text-slate-900 dark:text-white pt-10 pb-4 px-6 outline-none transition-all border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30 shadow-inner"
                  />
                  <span className="absolute right-8 top-12 text-lg font-black text-slate-400">kWh</span>
                </div>
              </div>
              
              {renderSlabBar()}

              <div className="glass-card p-8 rounded-[2.5rem] border-white/5 space-y-5 bg-gradient-to-br from-transparent to-emerald-500/5">
                <div className="grid grid-cols-2 gap-y-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{t('energy_cost_slab')}</span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">৳{formatNumber(forwardResult.energyCost.toFixed(1))}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{t('fixed_cost')}</span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">৳{formatNumber(DEMAND_CHARGE + METER_RENT)}</span>
                  </div>
                </div>
                
                <div className="h-[0.5px] w-full bg-black/5 dark:bg-white/10"></div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('vat_total')} (5%)</span>
                  </div>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tighter">৳{formatNumber(forwardResult.vatAmount.toFixed(1))}</span>
                </div>

                <div className="pt-4 mt-2 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1">{t('est_total_payable')}</div>
                    <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">৳{formatNumber(Math.round(forwardResult.totalPayable))}</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    ESTIMATED
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-black/5 dark:bg-white/5 p-5 rounded-[2rem] border border-white/5">
                <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                  {t('forward_explainer')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
              <div className="relative group">
                <label className="absolute left-6 top-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] z-10">
                  {t('enter_total_bill')}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number" min="0" value={targetBill}
                    onChange={(e) => setTargetBill(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    onFocus={handleFocus}
                    className="w-full h-24 rounded-[2rem] bg-black/5 dark:bg-white/5 text-5xl font-black text-slate-900 dark:text-white pt-10 pb-4 px-6 outline-none transition-all border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/30 shadow-inner"
                  />
                  <span className="absolute right-8 top-12 text-lg font-black text-slate-400">৳</span>
                </div>
              </div>

              {(typeof targetBill === 'number' && targetBill > 0) ? (
                <>
                   <div className="grid grid-cols-2 gap-5">
                      <div className="glass-card p-6 rounded-[2.5rem] bg-indigo-500/5 border-indigo-500/10">
                         <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">{t('estimated_consumption')}</div>
                         <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {formatNumber(reverseResult.totalUnits.toFixed(1))} <span className="text-xs font-medium tracking-normal text-slate-400">kWh</span>
                         </div>
                      </div>
                      <div className="glass-card p-6 rounded-[2.5rem] bg-emerald-500/5 border-emerald-500/10">
                         <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-3">Energy Base</div>
                         <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            ৳{formatNumber(Math.round(reverseResult.energyCost))}
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8 mt-12">
                      <div className="flex items-center gap-3 px-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-400">REVERSE AUDIT LOG</span>
                        <div className="h-[0.5px] flex-1 bg-black/5 dark:bg-white/10"></div>
                      </div>

                     {reverseResult.logicSteps.map((step, idx) => (
                        <div key={idx} className="space-y-4 animate-in fade-in duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
                           <div className="flex items-start gap-4">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-500">0{idx+1}</div>
                              <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{step.title}</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mt-1">{step.description}</p>
                              </div>
                           </div>
                           
                           <div className="space-y-4 pl-12">
                              {step.subSteps.map((sub, sIdx) => (
                                 <div key={sIdx} className="glass-card p-5 rounded-[2rem] border-white/5 active:scale-[0.98] transition-all">
                                    <div className="flex items-center gap-2 mb-3">
                                       <ArrowDownRight className="w-3.5 h-3.5 text-indigo-500" />
                                       <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{sub.label}</span>
                                    </div>
                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{sub.text}</div>
                                    <div className="bg-black/10 dark:bg-black/40 p-4 rounded-2xl text-[11px] font-mono text-indigo-500 dark:text-indigo-300 border border-white/5 whitespace-pre-wrap shadow-inner">
                                       {sub.calculation}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     ))}

                     <div className="glass-card p-8 rounded-[3rem] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-transparent text-center shadow-2xl shadow-indigo-500/20">
                        <ClipboardCheck className="w-10 h-10 mx-auto mb-4 text-white/40" />
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-100/60 mb-2">FINAL CALCULATED TOTAL</div>
                        <div className="text-6xl font-black tracking-tighter">{formatNumber(reverseResult.totalUnits.toFixed(2))} <span className="text-xl tracking-normal font-medium text-white/50">kWh</span></div>
                     </div>
                   </div>
                </>
              ) : (
                <div className="text-center py-20 bg-black/5 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
                  <Banknote className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <div className="text-slate-400 font-black uppercase tracking-widest text-xs">{t('enter_bill_prompt')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillEstimator;