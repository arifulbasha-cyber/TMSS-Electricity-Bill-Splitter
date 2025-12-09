import React from 'react';
import { MeterReading } from '../types';
import { Users, Trash2, Plus, Zap, Lock } from 'lucide-react';

interface MeterReadingsProps {
  mainMeter: MeterReading;
  onMainMeterUpdate: (reading: MeterReading) => void;
  readings: MeterReading[];
  onUpdate: (readings: MeterReading[]) => void;
}

const MeterReadings: React.FC<MeterReadingsProps> = ({ mainMeter, onMainMeterUpdate, readings, onUpdate }) => {
  const handleChange = (id: string, key: keyof MeterReading, value: string | number) => {
    const updated = readings.map(r => r.id === id ? { ...r, [key]: value } : r);
    onUpdate(updated);
  };

  const handleMainMeterChange = (key: keyof MeterReading, value: string | number) => {
    onMainMeterUpdate({ ...mainMeter, [key]: value });
  };

  const handleRemove = (id: string) => {
    onUpdate(readings.filter(r => r.id !== id));
  };

  const handleAdd = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const nextMeterNo = readings.length > 0 ? (parseInt(readings[readings.length - 1].meterNo) + 1).toString() : '1';
    onUpdate([...readings, { id: newId, name: 'New User', meterNo: nextMeterNo, previous: 0, current: 0 }]);
  };

  const totalUnits = readings.reduce((sum, r) => sum + (r.current - r.previous), 0);
  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 print-break-inside-avoid">
      <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">Meter Readings</h2>
        </div>
        <button
          onClick={handleAdd}
          className="no-print flex items-center gap-1 text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Meter</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="text-[10px] sm:text-xs text-slate-500 uppercase bg-slate-50/50">
            <tr>
              <th className="pl-2 pr-1 py-2 sm:px-4 sm:py-3 font-medium rounded-l-lg w-1/4 sm:w-auto">Name</th>
              <th className="hidden sm:table-cell px-4 py-3 font-medium">Meter No</th>
              <th className="px-1 py-2 sm:px-4 sm:py-3 font-medium text-right w-[15%] sm:w-auto">Prev</th>
              <th className="px-1 py-2 sm:px-4 sm:py-3 font-medium text-right w-[15%] sm:w-auto">Curr</th>
              <th className="px-1 py-2 sm:px-4 sm:py-3 font-medium text-right w-[15%] sm:w-auto">Unit</th>
              <th className="pl-1 pr-2 py-2 sm:px-4 sm:py-3 font-medium text-center no-print rounded-r-lg w-[10%] sm:w-auto"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {/* Main Meter Row */}
            <tr className="bg-indigo-50/30">
              <td className="pl-2 pr-1 py-2 sm:px-4 sm:py-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                   <div className="flex items-center gap-1">
                     <Lock className="w-3 h-3 text-slate-400" />
                     <span className="font-semibold text-slate-900">Main</span>
                   </div>
                   {/* Mobile Meter No Input */}
                   <input
                      type="text"
                      value={mainMeter.meterNo}
                      onChange={(e) => handleMainMeterChange('meterNo', e.target.value)}
                      className="sm:hidden w-full bg-transparent border-b border-dashed border-slate-300 text-[10px] text-slate-500 p-0 focus:ring-0 focus:border-indigo-300"
                      placeholder="#"
                    />
                </div>
              </td>
              <td className="hidden sm:table-cell px-4 py-2">
                <input
                  type="text"
                  value={mainMeter.meterNo}
                  onChange={(e) => handleMainMeterChange('meterNo', e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-600 p-0"
                />
              </td>
              <td className="px-1 py-2 sm:px-4 sm:py-2">
                <input
                  type="number"
                  value={mainMeter.previous}
                  onChange={(e) => handleMainMeterChange('previous', parseFloat(e.target.value) || 0)}
                  className="w-full text-right bg-transparent border-b border-indigo-200 focus:border-indigo-500 focus:ring-0 p-1"
                />
              </td>
              <td className="px-1 py-2 sm:px-4 sm:py-2">
                <input
                  type="number"
                  value={mainMeter.current}
                  onChange={(e) => handleMainMeterChange('current', parseFloat(e.target.value) || 0)}
                  className="w-full text-right bg-transparent border-b border-indigo-200 focus:border-indigo-500 focus:ring-0 p-1 font-medium"
                />
              </td>
              <td className="px-1 py-2 sm:px-4 sm:py-2 text-right">
                <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-100 text-indigo-800">
                  {mainMeterUnits}
                </span>
              </td>
              <td className="pl-1 pr-2 py-2 sm:px-4 sm:py-2 text-center no-print">
                 {/* No delete for main meter */}
              </td>
            </tr>

            {/* Separator Row (Optional) */}
            <tr><td colSpan={6} className="h-1 sm:h-2 bg-transparent"></td></tr>

            {/* Sub Meters */}
            {readings.map((reading) => {
              const units = Math.max(0, reading.current - reading.previous);
              return (
                <tr key={reading.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="pl-2 pr-1 py-2 sm:px-4 sm:py-2 align-top sm:align-middle">
                    <input
                      type="text"
                      value={reading.name}
                      onChange={(e) => handleChange(reading.id, 'name', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-900 placeholder-slate-400 p-0 text-xs sm:text-sm"
                      placeholder="Name"
                    />
                    {/* Mobile Meter No Input */}
                    <input
                      type="text"
                      value={reading.meterNo}
                      onChange={(e) => handleChange(reading.id, 'meterNo', e.target.value)}
                      className="sm:hidden w-full bg-transparent border-b border-slate-100 text-[10px] text-slate-400 p-0 mt-0.5 focus:ring-0 focus:border-indigo-300 placeholder-slate-300"
                      placeholder="Meter No"
                    />
                  </td>
                  <td className="hidden sm:table-cell px-4 py-2">
                    <input
                      type="text"
                      value={reading.meterNo}
                      onChange={(e) => handleChange(reading.id, 'meterNo', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-slate-600 p-0"
                    />
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-2 align-top sm:align-middle">
                    <input
                      type="number"
                      value={reading.previous}
                      onChange={(e) => handleChange(reading.id, 'previous', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-transparent focus:border-indigo-300 focus:ring-0 p-1"
                    />
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-2 align-top sm:align-middle">
                    <input
                      type="number"
                      value={reading.current}
                      onChange={(e) => handleChange(reading.id, 'current', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-transparent focus:border-indigo-300 focus:ring-0 p-1 font-medium"
                    />
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-2 text-right align-top sm:align-middle">
                    <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${units > 100 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                      {units}
                    </span>
                  </td>
                  <td className="pl-1 pr-2 py-2 sm:px-4 sm:py-2 text-center no-print align-top sm:align-middle">
                    <button
                      onClick={() => handleRemove(reading.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Remove meter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200 text-xs sm:text-sm">
            <tr>
              <td colSpan={3} className="pl-2 pr-1 py-3 sm:px-4 text-right uppercase tracking-wider hidden sm:table-cell">Total Units (Users)</td>
              <td colSpan={3} className="pl-2 pr-1 py-3 sm:px-4 text-right uppercase tracking-wider sm:hidden">Total</td>
              <td className="px-1 py-3 sm:px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                  {totalUnits}
                </div>
              </td>
              <td className="no-print"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default MeterReadings;