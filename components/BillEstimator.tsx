import React, { useState } from 'react';
import { Calculator, Zap, Info, Banknote, ArrowLeftRight } from 'lucide-react';

const BillEstimator: React.FC = () => {
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
    // Note: Usage > 400 is strictly ignored in this formula logic as per original implementation.

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
  const calculateUnits = (bill: number) => {
    // 1. Reverse VAT
    const taxableBase = bill / (1 + VAT_RATE);
    
    // 2. Reverse Fixed Charges
    const energyCost = taxableBase - (DEMAND_CHARGE + METER_RENT);

    if (energyCost <= 0) return { totalUnits: 0, steps: [], energyCost: 0, taxableBase };

    let remainingCost = energyCost;
    let totalUnits = 0;
    let previousLimit = 0;
    const steps = [];

    for (const slab of SLABS) {
      const slabSize = slab.limit - previousLimit;
      const maxCostForSlab = slabSize * slab.rate;

      // Check if we can cover this entire slab with remaining money
      if (remainingCost >= maxCostForSlab) {
        // Full slab
        totalUnits += slabSize;
        remainingCost -= maxCostForSlab;
        steps.push({
          slab: `${previousLimit + 1}-${slab.limit}`,
          rate: slab.rate,
          cost: maxCostForSlab,
          units: slabSize,
          full: true
        });
      } else {
        // Partial slab
        const unitsInSlab = remainingCost / slab.rate;
        totalUnits += unitsInSlab;
        steps.push({
          slab: `${previousLimit + 1}-${slab.limit}`,
          rate: slab.rate,
          cost: remainingCost,
          units: unitsInSlab,
          full: false
        });
        remainingCost = 0;
        break; // Done
      }
      previousLimit = slab.limit;
    }

    // Handle overflow (>400 units)
    // If there is still money left, it means the usage is higher than the top slab defined (400).
    // We'll assume the rate continues at the highest known rate (8.02) to give a useful estimate.
    if (remainingCost > 0.01) {
       const lastRate = SLABS[SLABS.length - 1].rate;
       const extraUnits = remainingCost / lastRate;
       totalUnits += extraUnits;
       steps.push({
          slab: `400+`,
          rate: lastRate,
          cost: remainingCost,
          units: extraUnits,
          full: false
       });
    }

    return { totalUnits, steps, energyCost, taxableBase };
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const forwardResult = calculateBill(typeof units === 'number' ? units : 0);
  const reverseResult = calculateUnits(typeof targetBill === 'number' ? targetBill : 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print-break-inside-avoid no-print">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">Bill Estimator</h2>
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
            <span className="hidden sm:inline">Units to Cost</span>
            <span className="sm:hidden">Units</span>
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
            <span className="hidden sm:inline">Cost to Units</span>
            <span className="sm:hidden">Cost</span>
          </button>
        </div>
      </div>

      {mode === 'forward' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
          {/* Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
              Enter Units Used <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={units}
                onChange={(e) => setUnits(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onFocus={handleFocus}
                placeholder="e.g. 205"
                className="w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-lg font-bold text-slate-900 pr-12"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium pointer-events-none">kWh</span>
            </div>
          </div>

          {/* Forward Results */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Energy Cost (Slab Rate)</span>
              <span className="font-medium text-slate-900">{forwardResult.energyCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Demand Charge</span>
              <span className="font-medium text-slate-900">{DEMAND_CHARGE}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Meter Rent</span>
              <span className="font-medium text-slate-900">{METER_RENT}</span>
            </div>
            
            <div className="border-t border-slate-200 my-2"></div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1">
                  <span className="text-slate-600">Total Base</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">Subject to VAT</span>
              </div>
              <span className="font-medium text-slate-900">{forwardResult.totalSubjectToVat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600">
              <span>VAT (5%)</span>
              <span>{forwardResult.vatAmount.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
              <span className="font-bold text-indigo-900 uppercase text-xs tracking-wider">Est. Total Payable</span>
              <span className="font-bold text-indigo-700 text-xl">৳{Math.round(forwardResult.totalPayable)}</span>
            </div>
          </div>

          {/* Forward Explainer */}
          <div className="flex gap-2 items-start bg-indigo-50 text-indigo-800 p-3 rounded-md text-xs">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="opacity-90 leading-relaxed">
              This calculation uses the LT-A residential slab rates: 
              0-75 units @ 5.26, 76-200 @ 7.20, 201-300 @ 7.59, 301-400 @ 8.02. 
              Includes 5% VAT on the total base amount.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-200">
           {/* Reverse Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
              Enter Total Bill Amount <Banknote className="w-3 h-3 text-indigo-500" />
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={targetBill}
                onChange={(e) => setTargetBill(e.target.value === '' ? '' : parseFloat(e.target.value))}
                onFocus={handleFocus}
                placeholder="e.g. 1500"
                className="w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-lg font-bold text-slate-900 pr-12"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium pointer-events-none">BDT</span>
            </div>
          </div>

          {(typeof targetBill === 'number' && targetBill > 0) ? (
            <>
               {/* Big Result */}
               <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 text-center">
                  <div className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Estimated Unit Consumption</div>
                  <div className="text-3xl font-bold text-slate-900">
                     {reverseResult.totalUnits.toFixed(2)} <span className="text-lg text-slate-500 font-medium">kWh</span>
                  </div>
               </div>

               {/* Breakdown */}
               <div className="space-y-4">
                 <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Calculation Process</h4>
                 
                 <div className="relative pl-4 space-y-4 border-l-2 border-indigo-100">
                    {/* Step 1 */}
                    <div className="space-y-1">
                       <span className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase">
                          Step 1: Reverse VAT
                       </span>
                       <p className="text-sm text-slate-600">
                          We divide the total ({targetBill}) by 1.05 to remove the 5% VAT.
                       </p>
                       <div className="bg-slate-50 p-2 rounded border border-slate-200 text-sm font-mono text-slate-700">
                          {targetBill} ÷ 1.05 = {reverseResult.taxableBase.toFixed(2)}
                       </div>
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-1">
                       <span className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase">
                          Step 2: Reverse Fixed Costs
                       </span>
                       <p className="text-sm text-slate-600">
                          Subtract Demand Charge ({DEMAND_CHARGE}) and Meter Rent ({METER_RENT}).
                       </p>
                       <div className="bg-slate-50 p-2 rounded border border-slate-200 text-sm font-mono text-slate-700">
                          {reverseResult.taxableBase.toFixed(2)} - {DEMAND_CHARGE + METER_RENT} = {reverseResult.energyCost.toFixed(2)}
                       </div>
                    </div>

                    {/* Step 3 */}
                    <div className="space-y-1">
                       <span className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase">
                          Step 3: Reverse Slabs
                       </span>
                       <p className="text-sm text-slate-600">
                          Calculate units from the remaining energy cost ({reverseResult.energyCost.toFixed(2)}) based on tiered rates.
                       </p>
                       <div className="bg-slate-50 rounded border border-slate-200 text-xs overflow-hidden">
                          <table className="w-full text-left">
                             <thead className="bg-slate-100 text-slate-500">
                                <tr>
                                   <th className="p-2 font-medium">Range</th>
                                   <th className="p-2 font-medium text-right">Rate</th>
                                   <th className="p-2 font-medium text-right">Cost Used</th>
                                   <th className="p-2 font-medium text-right">Units</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                {reverseResult.steps.map((step, i) => (
                                   <tr key={i}>
                                      <td className="p-2 text-slate-700">{step.slab}</td>
                                      <td className="p-2 text-right text-slate-500">{step.rate}</td>
                                      <td className="p-2 text-right text-slate-500">{step.cost.toFixed(2)}</td>
                                      <td className="p-2 text-right font-bold text-indigo-700">{step.units.toFixed(2)}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
               </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              Enter a bill amount to see the estimated units breakdown.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillEstimator;