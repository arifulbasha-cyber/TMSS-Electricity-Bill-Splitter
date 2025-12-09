import React, { useState } from 'react';
import { Calculator, Zap, Info, Banknote } from 'lucide-react';

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
    const taxableBase = bill / (1 + VAT_RATE);
    
    // Step 1b: Remove Fixed Charges
    const energyCost = taxableBase - (DEMAND_CHARGE + METER_RENT);

    const logicSteps: LogicStep[] = [];

    // Section 1
    logicSteps.push({
        title: "1. ⚙️ Reverse the VAT Calculation",
        description: "First, you must remove the VAT and Fixed Charges to isolate the VAT-Exclusive Energy Cost, which is the amount directly derived from units.",
        subSteps: [
            {
                label: "Step 1a: Remove VAT to Find the Taxable Base",
                text: `The Total Bill is the Taxable Base multiplied by (1 + VAT Rate).`,
                calculation: `${bill.toFixed(2)} / 1.05 = ${taxableBase.toFixed(2)}`
            },
            {
                label: "Step 1b: Remove Fixed Charges to Find Energy Cost",
                text: `The Total Subject to VAT includes the Fixed Charges. Subtract them to find the energy cost.`,
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
                  label: `Step 2${String.fromCharCode(97 + i)}: Test Slab ${stepBase.slabIndex}`,
                  text: `Subtract the cost of the first full slab from your Energy Cost.`,
                  calculation: `${stepBase.startCost.toFixed(2)} - ${maxCostForSlab.toFixed(2)} = ${remainingCost.toFixed(2)}`,
                  note: `Since remaining cost (${remainingCost.toFixed(2)}) is > 0, consumption is over ${slab.limit} units.`
              });
          } else {
              // Partial slab
              const unitsInSlab = remainingCost / slab.rate;
              totalUnits += unitsInSlab;
              
              slabSubSteps.push({
                  label: `Step 2${String.fromCharCode(97 + i)}: Calculate Units in Final Slab (Slab ${stepBase.slabIndex})`,
                  text: `The remaining cost (${stepBase.startCost.toFixed(2)}) must be the cost generated in this slab (Rate: ${slab.rate}). Divide cost by rate.`,
                  calculation: `${stepBase.startCost.toFixed(2)} / ${slab.rate} = ${unitsInSlab.toFixed(2)} units`
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
              label: `Step 2+: Above Slab Limit`,
              text: `Remaining cost attributed to highest rate (${lastRate}).`,
              calculation: `${remainingCost.toFixed(2)} / ${lastRate} = ${extraUnits.toFixed(2)} units`
           });
      }
    } else {
        slabSubSteps.push({
            label: "No Usage",
            text: "Energy cost is zero or negative, meaning the bill only covers fixed charges or is invalid.",
            calculation: "0 units"
        });
    }

    // Section 2
    logicSteps.push({
        title: "2. ⚡ Reverse the Tiered Rate Calculation (The Hard Part)",
        description: `Now you know the VAT-Exclusive Energy Cost is ${energyCost.toFixed(2)}. You must now figure out how many units generated this cost, working backward through the slabs.`,
        tableHeader: true,
        subSteps: slabSubSteps
    });
    
    // Section 3
    logicSteps.push({
        title: "3. Calculate Total Unit Consumption",
        description: "Sum the units used in all the completed slabs and the units calculated for the final slab.",
        subSteps: [{
            label: "Final Sum",
            text: `Total Units calculated across steps.`,
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
                className="w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-lg font-bold text-slate-900 pr-12 bg-white"
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
                placeholder="e.g. 1497.77"
                className="w-full rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-lg font-bold text-slate-900 pr-12 bg-white"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium pointer-events-none">BDT</span>
            </div>
          </div>

          {/* Intro Text */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-800 uppercase tracking-wide text-xs">estimated unit uses</p>
            <p className="text-sm">
              This is one of the most complex reverse calculations in utility billing because you are dealing with tiered rates.
              When you know the total bill and need to find the units, you must reverse every step we just performed. This calculation cannot be done with a single formula; it requires a systematic, step-by-step reversal, often involving trial and error or iteration, because the rate per unit depends on the unknown total number of units.
            </p>
          </div>

          {(typeof targetBill === 'number' && targetBill > 0) ? (
            <>
               {/* Component Table */}
               <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold text-xs uppercase">
                      <tr>
                        <th className="p-3 border-b border-slate-200">Component</th>
                        <th className="p-3 border-b border-slate-200">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      <tr><td className="p-3">Total Payable Bill</td><td className="p-3 font-medium">{targetBill.toFixed(2)}</td></tr>
                      <tr><td className="p-3">Fixed Charges (Demand + Rent)</td><td className="p-3 font-medium">{(DEMAND_CHARGE + METER_RENT).toFixed(2)}</td></tr>
                      <tr><td className="p-3">VAT Rate</td><td className="p-3 font-medium">5% or 0.05</td></tr>
                      <tr><td className="p-3">Slab Rates</td><td className="p-3 font-medium">{SLABS.map(s => s.rate).join(', ')}</td></tr>
                    </tbody>
                  </table>
               </div>

               {/* Big Result */}
               <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 text-center">
                  <div className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Estimated Unit Consumption</div>
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
                                 <th className="p-2 border-b">Slab Range</th>
                                 <th className="p-2 border-b">Units in Slab</th>
                                 <th className="p-2 border-b">Rate</th>
                                 <th className="p-2 border-b">Cost for Full Slab</th>
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
                  <strong>Key Takeaway:</strong> If the price system uses tiered rates, you must reverse the fixed and VAT charges first, then work backward through the tiers to find which slab the final consumption fell into.
               </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Enter a bill amount to see the estimated units breakdown.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillEstimator;