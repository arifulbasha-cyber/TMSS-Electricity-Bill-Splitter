import React, { useState } from 'react';
import { Calculator, Zap, Info, Banknote } from 'lucide-react';
import { useLanguage } from '../i18n';

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

const BillEstimator: React.FC = () => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [units, setUnits] = useState<number | string>('');
  const [targetBill, setTargetBill] = useState<number | string>('');

  // Constants
  const DEMAND_CHARGE = 84;
  const METER_RENT = 10;
  const VAT_RATE = 0.05; // 5%

  // Slabs configuration
  const SLABS = [
    { limit: 75, rate: 5.26 },
    { limit: 200, rate: 7.20 },
    { limit: 300, rate: 7.59 },
    { limit: 400, rate: 8.02 },
  ];

  // --- Forward Calculation ---
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

  // --- Reverse Calculation ---
  const calculateUnitsDetailed = (bill: number) => {
    // Step 1: Reverse VAT
    // Formula provided: VAT Amount = Total Bill * VAT Rate / (1 + VAT Rate)
    const vatAmount = (bill * VAT_RATE) / (1 + VAT_RATE);
    const taxableBase = bill - vatAmount;
    
    // Step 1b: Remove Fixed Charges
    const energyCost = taxableBase - (DEMAND_CHARGE + METER_RENT);

    const logicSteps: LogicStep[] = [];

    // Section 1
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
              // Full slab
              totalUnits += slabSize;
              remainingCost -= maxCostForSlab;
              
              slabSubSteps.push({
                  label: `${t('test_slab')} ${stepBase.slabIndex}`,
                  text: t('test_slab_text'),
                  calculation: `${stepBase.startCost.toFixed(2)} - ${maxCostForSlab.toFixed(2)} = ${remainingCost.toFixed(2)}`,
                  note: `Since remaining cost (${remainingCost.toFixed(2)}) is > 0, consumption is over ${slab.limit} units.`
              });
          } else {
              // Partial slab
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
      
      // Handle overflow (>400 units)
      if (remainingCost > 0.01) {
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

    // Section 2
    logicSteps.push({
        title: t('step2_title'),
        description: t('step2_desc'),
        tableHeader: true,
        subSteps: slabSubSteps
    });
    
    // Section 3
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

  const forwardResult = calculateBill(typeof units === 'number' ? units : 0);
  const reverseResult = calculateUnitsDetailed(typeof targetBill === 'number' ? targetBill : 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print-break-inside-avoid no-print">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">{t('bill_estimator')}</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setMode('forward')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              mode === 'forward' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
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
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
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
          {/* Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
              {t('enter_units_used')} <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={units}
                onChange={(e) => setUnits(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onFocus={handleFocus}
                placeholder="e.g. 205"
                className="w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-lg font-bold text-slate-900 pr-12 bg-white"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium pointer-events-none">kWh</span>
            </div>
          </div>

          {/* Forward Results */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">{t('energy_cost_slab')}</span>
              <span className="font-medium text-slate-900">{forwardResult.energyCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">{t('demand_charge')}</span>
              <span className="font-medium text-slate-900">{DEMAND_CHARGE}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">{t('meter_rent')}</span>
              <span className="font-medium text-slate-900">{METER_RENT}</span>
            </div>
            
            <div className="border-t border-slate-200 my-2"></div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1">
                  <span className="text-slate-600">{t('total_base')}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">{t('subject_to_vat')}</span>
              </div>
              <span className="font-medium text-slate-900">{forwardResult.totalSubjectToVat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>{t('vat_total')}</span>
              <span>{forwardResult.vatAmount.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
              <span className="font-bold text-indigo-900 uppercase text-xs tracking-wider">{t('est_total_payable')}</span>
              <span className="font-bold text-indigo-700 text-xl">৳{Math.round(forwardResult.totalPayable)}</span>
            </div>
          </div>

          {/* Forward Explainer */}
          <div className="flex gap-2 items-start bg-indigo-50 text-indigo-800 p-3 rounded-md text-xs">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="opacity-90 leading-relaxed">
              {t('forward_explainer')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-200">
           {/* Reverse Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
              {t('enter_total_bill')} <Banknote className="w-3 h-3 text-indigo-500" />
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={targetBill}
                onChange={(e) => setTargetBill(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onFocus={handleFocus}
                placeholder="e.g. 1497.77"
                className="w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-lg font-bold text-slate-900 pr-12 bg-white"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium pointer-events-none">{t('bdt')}</span>
            </div>
          </div>

          {/* Intro Text */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-800 uppercase tracking-wide text-xs">{t('est_unit_uses')}</p>
            <p className="text-sm">
              {t('reverse_intro_1')}
            </p>
            <p className="text-sm">
              {t('reverse_intro_2')}
            </p>
          </div>

          {(typeof targetBill === 'number' && targetBill > 0) ? (
            <>
               {/* Component Table */}
               <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold text-xs uppercase">
                      <tr>
                        <th className="p-3 border-b border-slate-200">{t('component')}</th>
                        <th className="p-3 border-b border-slate-200">{t('value')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      <tr><td className="p-3">{t('total_bill_payable')}</td><td className="p-3 font-medium">{targetBill.toFixed(2)}</td></tr>
                      <tr><td className="p-3">{t('fixed_charges')}</td><td className="p-3 font-medium">{(DEMAND_CHARGE + METER_RENT).toFixed(2)}</td></tr>
                      <tr><td className="p-3">{t('vat_rate')}</td><td className="p-3 font-medium">5% (0.05)</td></tr>
                      <tr><td className="p-3">{t('slab_rates')}</td><td className="p-3 font-medium">{SLABS.map(s => s.rate).join(', ')}</td></tr>
                    </tbody>
                  </table>
               </div>

               {/* Big Result */}
               <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 text-center">
                  <div className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">{t('estimated_consumption')}</div>
                  <div className="text-3xl font-bold text-slate-900">
                     {reverseResult.totalUnits.toFixed(2)} <span className="text-lg text-slate-500 font-medium">kWh</span>
                  </div>
               </div>

               {/* Breakdown Steps */}
               <div className="space-y-6">
                 {reverseResult.logicSteps.map((step, idx) => (
                    <div key={idx} className="space-y-3">
                       <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">{step.title}</h4>
                       <p className="text-xs text-slate-500 italic leading-relaxed">{step.description}</p>
                       
                       {/* Table for Slabs section */}
                       {step.tableHeader && (
                         <div className="overflow-x-auto mb-2 rounded border border-slate-200">
                           <table className="w-full text-xs text-left">
                             <thead className="bg-slate-100 text-slate-500 font-medium">
                               <tr>
                                 <th className="p-2 border-b">{t('slab_range')}</th>
                                 <th className="p-2 border-b">{t('units_in_slab')}</th>
                                 <th className="p-2 border-b">{t('rate')}</th>
                                 <th className="p-2 border-b">{t('cost_full_slab')}</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                               {SLABS.map((s, i) => {
                                 const prev = i === 0 ? 0 : SLABS[i-1].limit;
                                 const size = s.limit - prev;
                                 const cost = size * s.rate;
                                 return (
                                   <tr key={i}>
                                     <td className="p-2">{i+1} ({prev}-{s.limit})</td>
                                     <td className="p-2">{size}</td>
                                     <td className="p-2">{s.rate}</td>
                                     <td className="p-2">{cost.toFixed(2)}</td>
                                   </tr>
                                 )
                               })}
                             </tbody>
                           </table>
                         </div>
                       )}

                       <div className="space-y-3 pl-2 border-l-2 border-indigo-100">
                          {step.subSteps.map((sub, sIdx) => (
                             <div key={sIdx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                <div className="text-xs font-bold text-indigo-700 mb-1">{sub.label}</div>
                                <div className="text-sm text-slate-700 mb-2">{sub.text}</div>
                                <div className="bg-slate-50 p-2 rounded text-xs font-mono text-slate-600 border border-slate-200 whitespace-pre-wrap">
                                   {sub.calculation}
                                </div>
                                {sub.note && (
                                   <div className="mt-2 text-xs text-orange-600 font-medium bg-orange-50 p-1.5 rounded">
                                      {sub.note}
                                   </div>
                                )}
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
               </div>
               
               <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-xs text-green-800 font-medium leading-relaxed">
                  <strong>{t('key_takeaway')}:</strong> {t('key_takeaway_text')}
               </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
              {t('enter_bill_prompt')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillEstimator;
