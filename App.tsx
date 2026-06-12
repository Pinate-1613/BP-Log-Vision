import React, { useState, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { extractReadingsFromImage } from './services/geminiService';
import type { BloodPressureReading, RawReading } from './types';
import { CameraView } from './components/CameraView';
import { ReadingCard } from './components/ReadingCard';
import { HistoryChart } from './components/HistoryChart';
import { CameraIcon, SaveIcon, RefreshIcon, ExportIcon, ImportIcon, WarningIcon } from './components/Icons';

type AppView = 'home' | 'camera' | 'processing' | 'result' | 'error';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('home');
    // Store an array of all readings
    const [readings, setReadings] = useLocalStorage<BloodPressureReading[]>('bpReadings', []);
    const [latestReading, setLatestReading] = useState<RawReading | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCapture = async (base64Image: string) => {
        setView('processing');
        setError(null);
        try {
            const result = await extractReadingsFromImage(base64Image);
            setLatestReading(result);
            setView('result');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setView('error');
        }
    };

    const handleSave = () => {
        if (latestReading) {
            const newReading: BloodPressureReading = {
                ...latestReading,
                timestamp: Date.now(),
            };
            // Prepend the new reading to the array and re-sort
            const updatedReadings = [...readings, newReading].sort((a, b) => b.timestamp - a.timestamp);
            setReadings(updatedReadings);
            setLatestReading(null);
            setView('home');
        }
    };
    
    const handleExport = () => {
        if (readings.length === 0) {
            alert("No data to export.");
            return;
        }
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify(readings, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            const fileName = `bp_log_vision_export_${new Date().toISOString().split('T')[0]}.json`;
            link.download = fileName;
            link.click();
            alert(`Successfully exported data to "${fileName}".`);
        } catch (err) {
            console.error("Error exporting data:", err);
            alert("Could not export data due to an unexpected error.");
        }
    };

    const handleRetake = () => {
        setLatestReading(null);
        setView('camera');
    };

    const triggerImport = () => {
        fileInputRef.current?.click();
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("Failed to read file content.");
                }
                const importedData = JSON.parse(text);

                if (!Array.isArray(importedData)) {
                    throw new Error("Invalid file format. Expected an array of readings.");
                }

                if (importedData.length === 0) {
                   alert("Import file is empty. No changes were made.");
                   return;
                }

                const validReadings: BloodPressureReading[] = importedData.filter((reading: any) => 
                    typeof reading.systolic === 'number' &&
                    typeof reading.diastolic === 'number' &&
                    typeof reading.pulse === 'number' &&
                    typeof reading.timestamp === 'number'
                );
                
                if (validReadings.length !== importedData.length) {
                    alert("Some records in the file were invalid and have been skipped.");
                }

                if (validReadings.length > 0) {
                   if (readings.length > 0 && !window.confirm("This will overwrite all your current data. Are you sure you want to continue?")) {
                       // Clear the file input value to allow re-selection of the same file
                       if (event.target) event.target.value = '';
                       return; // User cancelled
                   }
                   validReadings.sort((a, b) => b.timestamp - a.timestamp); // sort most recent first
                   setReadings(validReadings);
                   alert(`Successfully imported ${validReadings.length} readings.`);
                }
            } catch (err) {
                console.error("Error importing data:", err);
                alert(err instanceof Error ? err.message : "An unknown error occurred during import.");
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.onerror = () => {
             alert('Failed to read the file.');
             if (event.target) {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const renderView = () => {
        switch (view) {
            case 'camera':
                return <CameraView onCapture={handleCapture} onClose={() => setView('home')} />;
            case 'processing':
                return (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div>
                        <p className="mt-4 text-lg">Analyzing Image...</p>
                    </div>
                );
            case 'result':
                return (
                    <div className="p-4 flex flex-col items-center justify-center h-full">
                        <h2 className="text-2xl font-bold text-white mb-4">Confirm Reading</h2>
                        {latestReading && <ReadingCard reading={{...latestReading, timestamp: Date.now()}} />}
                        <div className="mt-8 flex gap-4 w-full max-w-sm">
                            <button onClick={handleRetake} className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                <RefreshIcon className="w-5 h-5" /> Retake
                            </button>
                            <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                <SaveIcon className="w-5 h-5" /> Save
                            </button>
                        </div>
                    </div>
                );
             case 'error':
                return (
                    <div className="p-4 flex flex-col items-center justify-center h-full text-center text-white">
                        <WarningIcon className="w-20 h-20 text-red-400 mb-4" />
                        <h2 className="text-2xl font-bold text-red-300 mb-2">Analysis Failed</h2>
                        <p className="text-gray-300 mb-8 max-w-sm">{error || 'An unknown error occurred.'}</p>
                        <div className="flex gap-4 w-full max-w-sm">
                             <button 
                                onClick={() => {
                                    setError(null);
                                    setView('home');
                                }} 
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                Go Home
                            </button>
                            <button 
                                onClick={() => {
                                    setError(null);
                                    setView('camera');
                                }} 
                                className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                <RefreshIcon className="w-5 h-5" /> Try Again
                            </button>
                        </div>
                    </div>
                );
            case 'home':
            default:
                return (
                    <div className="p-4 md:p-6 flex flex-col h-full">
                        <header className="flex justify-between items-center mb-6 pt-4">
                            <button onClick={triggerImport} className="flex flex-col items-center text-cyan-200 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10" aria-label="Import data" title="Import Data">
                                <ImportIcon className="w-8 h-8" />
                                <span className="text-xs mt-1">Import</span>
                            </button>
                            <div className="text-center px-2">
                                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">BP Log Vision</h1>
                                <p className="text-cyan-200 text-sm">Your visual blood pressure tracker.</p>
                            </div>
                            <button onClick={handleExport} className="flex flex-col items-center text-cyan-200 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10" aria-label="Export data" title="Export Data">
                                <ExportIcon className="w-8 h-8" />
                                <span className="text-xs mt-1">Export</span>
                            </button>
                        </header>
                        
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ position: 'absolute', left: '-9999px' }}
                            accept="application/json,.json"
                            onChange={handleImport}
                            aria-hidden="true"
                        />

                        {error && (
                            <div className="bg-red-500/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                                <strong className="font-bold">Error: </strong>
                                <span className="block sm:inline">{error}</span>
                                <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                                    <span className="text-2xl">&times;</span>
                                </button>
                            </div>
                        )}
                        
                        <div className="flex-grow flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                            <HistoryChart data={readings} />

                            {readings.length > 0 && <h2 className="text-lg font-semibold text-white/90 -mb-2 px-2">History</h2>}

                            {readings.length > 0 ? (
                                readings.map(reading => (
                                    <ReadingCard key={reading.timestamp} reading={reading} />
                                ))
                            ) : (
                                <div className="flex-grow flex items-center justify-center text-center text-gray-400 -mt-24">
                                    <p>No readings saved yet.<br/>Tap the camera to start.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-auto pt-4 pb-4 flex justify-center">
                            <button onClick={() => setView('camera')} className="flex items-center gap-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out">
                                <CameraIcon className="w-7 h-7"/>
                                <span className="text-lg">Scan New Reading</span>
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <main className="bg-slate-900 min-h-screen font-sans">
             <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,#3e9cbf22,transparent)]"></div>
            <div className="relative h-screen w-full max-w-md mx-auto flex flex-col">
                {renderView()}
            </div>
        </main>
    );
};

export default App;