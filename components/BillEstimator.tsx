
import React, { useState } from 'react';
import { Calculator, Zap, Info, Banknote, ChevronRight } from 'lucide-react';
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
  const { t } = useLanguage();
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
          
          const stepBase = {
              slabIndex: i + 1,
              range: `${previousLimit}-${slab.limit}`,
              rate: slab.rate,
              startCost: remainingCost,
          };

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
        <div className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
           <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('current_tier')}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                 {currentUnits} kWh
              </span>
           </div>
           
           <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
              {SLABS.map((slab, idx) => {
                 const isActive = idx === currentSlabIdx || (idx === SLABS.length -1 && currentSlabIdx >= idx);
                 const isPassed = idx < currentSlabIdx;
                 
                 return (
                    <div 
                      key={idx} 
                      className={`flex-1 border-r border-white/20 last:border-0 relative group transition-all duration-300 ${isPassed ? colors[idx % colors.length] : (isActive ? colors[idx % colors.length] : 'bg-slate-300 dark:bg-slate-600')}`}
                    >
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                           {slab.rate}
                        </div>
                    </div>
                 );
              })}
              <div className={`flex-1 relative ${currentSlabIdx >= SLABS.length ? 'bg-emerald-800' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
           </div>
           
           <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono">
              <span>0</span>
              {SLABS.map((s,i) => <span key={i}>{s.limit}</span>)}
              <span>+</span>
           </div>
           
           {currentUnits > 0 && (
             <div className="mt-2 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                You are paying <span className="font-bold">৳{currentSlabIdx < SLABS.length ? SLABS[currentSlabIdx]?.rate : SLABS[SLABS.length-1]?.rate}</span> per unit for current consumption.
             </div>
           )}
        </div>
     );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 print-break-inside-avoid no-print transition-colors duration-200">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('bill_estimator')}</h2>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setMode('forward')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              mode === 'forward' 
                ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-300 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span className="hidden sm:inline">{t('units_to_cost')}</span>
            <span className="sm:hidden">{t('units')}</span>
          </button>
          <button
            onClick={() => setMode('reverse')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              mode === 'reverse' 
                ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-300 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Banknote className="w-3 h-3" />
            <span className="hidden sm:inline">{t('cost_to_units')}</span>
            <span className="sm:hidden">{t('cost')}</span>
          </button>
        </div>
      </div>

      {mode === 'forward' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
              {t('enter_units_used')} <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={units}
                onChange={(e) => setUnits(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onFocus={handleFocus}
                placeholder="e.g. 205"
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 text-lg font-bold text-slate-900 dark:text-white pr-12 bg-white dark:bg-slate-950 outline-none"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium pointer-events-none">kWh</span>
            </div>
          </div>
          
          {renderSlabBar()}

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">{t('energy_cost_slab')}</span>
              <span className="font-medium text-slate-900 dark:text-white">{forwardResult.energyCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">{t('demand_charge')}</span>
              <span className="font-medium text-slate-900 dark:text-white">{DEMAND_CHARGE}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">{t('meter_rent')}</span>
              <span className="font-medium text-slate-900 dark:text-white">{METER_RENT}</span>
            </div>
            
            <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1">
                  <span className="text-slate-600 dark:text-slate-400">{t('total_base')}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700">{t('subject_to_vat')}</span>
              </div>
              <span className="font-medium text-slate-900 dark:text-white">{forwardResult.totalSubjectToVat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
              <span>{t('vat_total')} ({VAT_RATE*100}%)</span>
              <span>{forwardResult.vatAmount.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 uppercase text-xs tracking-wider">{t('est_total_payable')}</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xl">৳{Math.round(forwardResult.totalPayable)}</span>
            </div>
          </div>

          <div className="flex gap-2 items-start bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-md text-xs">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="opacity-90 leading-relaxed">
              {t('forward_explainer')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-200">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
              {t('enter_total_bill')} <Banknote className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={targetBill}
                onChange={(e) => setTargetBill(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onFocus={handleFocus}
                placeholder="e.g. 1497.77"
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 text-lg font-bold text-slate-900 dark:text-white pr-12 bg-white dark:bg-slate-950 outline-none"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium pointer-events-none">{t('bdt')}</span>
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-slate-800/50 p-4 rounded-lg border border-emerald-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p className="font-medium text-slate-800 dark:text-slate-200 uppercase tracking-wide text-xs">{t('est_unit_uses')}</p>
            <p className="text-sm">
              {t('reverse_intro_1')}
            </p>
            <p className="text-sm">
              {t('reverse_intro_2')}
            </p>
          </div>

          {(typeof targetBill === 'number' && targetBill > 0) ? (
            <>
               <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase">
                      <tr>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700">{t('component')}</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700">{t('value')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                      <tr><td className="p-3">{t('total_bill_payable')}</td><td className="p-3 font-medium">{targetBill.toFixed(2)}</td></tr>
                      <tr><td className="p-3">{t('fixed_charges')}</td><td className="p-3 font-medium">{(DEMAND_CHARGE + METER_RENT).toFixed(2)}</td></tr>
                      <tr><td className="p-3">{t('vat_rate')}</td><td className="p-3 font-medium">{VAT_RATE * 100}% ({VAT_RATE})</td></tr>
                      <tr><td className="p-3">{t('slab_rates')}</td><td className="p-3 font-medium">{SLABS.map(s => s.rate).join(', ')}</td></tr>
                    </tbody>
                  </table>
               </div>

               <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 border border-emerald-100 dark:border-emerald-800 text-center">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider mb-1">{t('estimated_consumption')}</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                     {reverseResult.totalUnits.toFixed(2)} <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">kWh</span>
                  </div>
               </div>

               <div className="space-y-6">
                 {reverseResult.logicSteps.map((step, idx) => (
                    <div key={idx} className="space-y-3">
                       <h4 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">{step.title}</h4>
                       <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">{step.description}</p>
                       
                       <div className="space-y-3 pl-2 border-l-2 border-emerald-100 dark:border-emerald-900">
                          {step.subSteps.map((sub, sIdx) => (
                             <div key={sIdx} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">{sub.label}</div>
                                <div className="text-sm text-slate-700 dark:text-slate-300 mb-2">{sub.text}</div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                                   {sub.calculation}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
               </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
              {t('enter_bill_prompt')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillEstimator;
