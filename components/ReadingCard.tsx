
import React from 'react';
import type { BloodPressureReading } from '../types';

interface ReadingCardProps {
  reading: BloodPressureReading;
}

const getCategory = (systolic: number, diastolic: number): { name: string; color: string } => {
    if (systolic < 120 && diastolic < 80) return { name: 'Normal', color: 'bg-green-500' };
    if (systolic >= 120 && systolic <= 129 && diastolic < 80) return { name: 'Elevated', color: 'bg-yellow-500' };
    if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { name: 'High Blood Pressure (Stage 1)', color: 'bg-orange-500' };
    if (systolic >= 140 || diastolic >= 90) return { name: 'High Blood Pressure (Stage 2)', color: 'bg-red-500' };
    if (systolic > 180 || diastolic > 120) return { name: 'Hypertensive Crisis', color: 'bg-red-700' };
    return { name: 'Consult Doctor', color: 'bg-gray-500' };
};

export const ReadingCard: React.FC<ReadingCardProps> = ({ reading }) => {
    const { name, color } = getCategory(reading.systolic, reading.diastolic);

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 shadow-lg text-white border border-white/20">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-gray-300">
                        {new Date(reading.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                        {new Date(reading.timestamp).toLocaleTimeString()}
                    </p>
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
                    {name}
                </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-xs text-gray-300 uppercase">Systolic</p>
                    <p className="text-2xl font-bold">{reading.systolic}</p>
                    <p className="text-xs text-gray-400">mmHg</p>
                </div>
                <div>
                    <p className="text-xs text-gray-300 uppercase">Diastolic</p>
                    <p className="text-2xl font-bold">{reading.diastolic}</p>
                    <p className="text-xs text-gray-400">mmHg</p>
                </div>
                <div>
                    <p className="text-xs text-gray-300 uppercase">Pulse</p>
                    <p className="text-2xl font-bold">{reading.pulse}</p>
                    <p className="text-xs text-gray-400">BPM</p>
                </div>
            </div>
        </div>
    );
};
