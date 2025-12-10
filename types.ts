
export interface BillConfig {
  month: string;
  dateGenerated: string;
  totalBillPayable: number;
  bkashFee: number;
  lateFee: number;
}

export interface MeterReading {
  id: string;
  name: string;
  meterNo: string;
  previous: number;
  current: number;
}

export interface UserCalculation {
  id: string;
  name: string;
  unitsUsed: number;
  energyCost: number;
  fixedCost: number;
  totalPayable: number;
}

export interface BillCalculationResult {
  vatFixed: number;
  vatDistributed: number;
  vatTotal: number;
  calculatedRate: number;
  totalUnits: number;
  userCalculations: UserCalculation[];
  totalCollection: number;
}

export interface SavedBill {
  id: string;
  savedAt: string;
  config: BillConfig;
  mainMeter: MeterReading;
  meters: MeterReading[];
}