
export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  pulse: number;
  timestamp: number;
}

export type RawReading = Omit<BloodPressureReading, 'timestamp'>;
