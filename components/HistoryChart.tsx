import React, { useState, useRef } from 'react';
import type { BloodPressureReading } from '../types';

interface HistoryChartProps {
  data: BloodPressureReading[];
}

export const HistoryChart: React.FC<HistoryChartProps> = ({ data }) => {
  const [activePoint, setActivePoint] = useState<BloodPressureReading | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ display: 'none' });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate 7-day average
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7DaysReadings = data.filter(r => r.timestamp >= sevenDaysAgo);
  const has7DayReadings = last7DaysReadings.length > 0;

  const avgSystolic = has7DayReadings
    ? Math.round(last7DaysReadings.reduce((sum, r) => sum + r.systolic, 0) / last7DaysReadings.length)
    : null;

  const avgDiastolic = has7DayReadings
    ? Math.round(last7DaysReadings.reduce((sum, r) => sum + r.diastolic, 0) / last7DaysReadings.length)
    : null;

  const avgPulse = has7DayReadings
    ? Math.round(last7DaysReadings.reduce((sum, r) => sum + r.pulse, 0) / last7DaysReadings.length)
    : null;

  if (data.length < 2) {
    return (
      <div id="bp-history-empty" className="bg-white/10 backdrop-blur-sm rounded-xl p-4 shadow-lg text-white border border-white/20 flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Blood Pressure Trend</h3>
            <p className="text-xs text-gray-400">Visualization of tracked measurements</p>
          </div>
          
          {/* Average status if we have 1 reading */}
          {data.length === 1 && (
            <div id="bp-history-avg-pill" className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-3 text-xs">
              <div className="flex flex-col">
                <span className="text-gray-400 text-[9px] uppercase tracking-wider font-semibold">7-Day Avg</span>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-sm font-bold text-cyan-400">{avgSystolic !== null ? avgSystolic : '—'}</span>
                  <span className="text-gray-400 mx-0.5">/</span>
                  <span className="text-sm font-bold text-purple-400">{avgDiastolic !== null ? avgDiastolic : '—'}</span>
                  <span className="text-gray-400 text-[10px] ml-1">mmHg</span>
                </div>
              </div>
              <div className="w-[1px] h-6 bg-white/10"></div>
              <div className="flex flex-col justify-center">
                <span className="text-gray-400 text-[9px] uppercase tracking-wider font-semibold">Pulse Avg</span>
                <span className="text-xs font-semibold text-emerald-400 mt-0.5">
                  {avgPulse !== null ? `${avgPulse} bpm` : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="h-44 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-center p-4">
          <p className="text-sm text-gray-400 max-w-xs">
            {data.length === 0 
              ? "No readings logged yet. Scan a reading using your camera to see your 7-day averages and trend chart."
              : "Log at least two readings to see your trend chart."}
          </p>
        </div>
      </div>
    );
  }

  // Sort data from oldest to newest for charting
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

  const width = 300;
  const height = 180;
  const padding = { top: 20, right: 15, bottom: 30, left: 30 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = sortedData.flatMap(d => [d.systolic, d.diastolic]);
  const yMin = Math.min(...allValues) - 10;
  const yMax = Math.max(...allValues) + 10;

  const xMin = sortedData[0].timestamp;
  const xMax = sortedData[sortedData.length - 1].timestamp;

  const getX = (timestamp: number) => {
    if (xMax === xMin) return padding.left; // Avoid division by zero
    return padding.left + ((timestamp - xMin) / (xMax - xMin)) * chartWidth;
  };

  const getY = (value: number) => {
     if (yMax === yMin) return padding.top + chartHeight / 2;
    return padding.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;
  };

  const createPath = (key: 'systolic' | 'diastolic') => {
    let path = `M ${getX(sortedData[0].timestamp)} ${getY(sortedData[0][key])}`;
    sortedData.slice(1).forEach(d => {
      path += ` L ${getX(d.timestamp)} ${getY(d[key])}`;
    });
    return path;
  };

  const systolicPath = createPath('systolic');
  const diastolicPath = createPath('diastolic');
  
  const yAxisLabels = () => {
      const labels = [];
      const range = yMax - yMin;
      const step = Math.ceil(range / 5 / 10) * 10;
      let current = Math.floor(yMin / 10) * 10;
      while (current <= yMax + step) {
          if (current >= yMin) {
            labels.push(current);
          }
          current += step;
          if (labels.length > 6) break;
      }
      return labels.filter(l => l <= yMax + 5);
  }

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;

    const svgRect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;

    let closestPoint: BloodPressureReading | null = null;
    let minDistance = Infinity;

    sortedData.forEach(point => {
        const pointX = getX(point.timestamp);
        const pointYsys = getY(point.systolic);
        const pointYdia = getY(point.diastolic);

        const distSys = Math.hypot(mouseX - pointX, mouseY - pointYsys);
        const distDia = Math.hypot(mouseX - pointX, mouseY - pointYdia);
        
        const distance = Math.min(distSys, distDia);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
        }
    });

    if (closestPoint && minDistance < 25) { // 25px hover radius
        setActivePoint(closestPoint);
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const tooltipX = event.clientX - containerRect.left;
        const tooltipY = event.clientY - containerRect.top;

        const tooltipWidth = 150; 
        const finalX = (tooltipX + tooltipWidth > containerRect.width) 
            ? tooltipX - tooltipWidth - 15
            : tooltipX + 15;

        setTooltipStyle({
            display: 'block',
            position: 'absolute',
            left: `${finalX}px`,
            top: `${tooltipY + 15}px`,
        });
    } else {
        setActivePoint(null);
    }
  };

  const handleMouseLeave = () => {
      setActivePoint(null);
  };

  return (
    <div id="bp-trend-container" ref={containerRef} className="relative bg-white/10 backdrop-blur-sm rounded-xl p-4 shadow-lg text-white border border-white/20">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Blood Pressure Trend</h3>
          <p className="text-xs text-gray-400">Visualization of tracked measurements</p>
        </div>
        <div id="bp-trend-kpi" className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-4 text-xs">
          <div className="flex flex-col">
            <span className="text-gray-400 text-[9px] uppercase tracking-wider font-semibold">7-Day Avg</span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className={`text-sm md:text-base font-bold ${avgSystolic ? 'text-cyan-400' : 'text-gray-500'}`}>
                {avgSystolic !== null ? avgSystolic : '—'}
              </span>
              <span className="text-gray-400 mx-0.5">/</span>
              <span className={`text-sm md:text-base font-bold ${avgDiastolic ? 'text-purple-400' : 'text-gray-500'}`}>
                {avgDiastolic !== null ? avgDiastolic : '—'}
              </span>
              <span className="text-gray-400 text-[10px] ml-1 font-medium">mmHg</span>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-[9px] uppercase tracking-wider font-semibold">Pulse Avg</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5">
              {avgPulse !== null ? `${avgPulse} bpm` : '—'}
            </span>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div className="flex flex-col justify-center">
            <span className="text-gray-400 text-[9px] uppercase tracking-wider font-semibold">Readings</span>
            <span className="text-xs font-semibold text-cyan-200 mt-0.5">
              {last7DaysReadings.length} {last7DaysReadings.length === 1 ? 'reading' : 'readings'}
            </span>
          </div>
        </div>
      </div>

      <svg 
        id="bp-trend-svg"
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto cursor-crosshair" 
        aria-labelledby="chart-title" 
        role="img"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <title id="chart-title">An interactive line chart showing blood pressure readings over time.</title>
        {/* Y-Axis Grid Lines and Labels */}
        {yAxisLabels().map(label => (
            <g key={label} className="text-gray-400">
                <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={getY(label)}
                    y2={getY(label)}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                />
                <text
                    x={padding.left - 5}
                    y={getY(label) + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="currentColor"
                >
                    {label}
                </text>
            </g>
        ))}
        {/* X-Axis Labels */}
        <text
            x={padding.left}
            y={height - padding.bottom + 15}
            textAnchor="start"
            fontSize="10"
            fill="currentColor"
            className="text-gray-400"
        >
            {new Date(sortedData[0].timestamp).toLocaleDateString()}
        </text>
         <text
            x={width - padding.right}
            y={height - padding.bottom + 15}
            textAnchor="end"
            fontSize="10"
            fill="currentColor"
            className="text-gray-400"
        >
            {new Date(sortedData[sortedData.length - 1].timestamp).toLocaleDateString()}
        </text>

        {/* 7-day Average Reference Lines */}
        {avgSystolic !== null && (
          <g>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={getY(avgSystolic)}
              y2={getY(avgSystolic)}
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <text
              x={width - padding.right - 5}
              y={getY(avgSystolic) - 4}
              textAnchor="end"
              fontSize="8"
              fill="#38bdf8"
              opacity="0.8"
            >
              7d Avg Sys ({avgSystolic})
            </text>
          </g>
        )}
        {avgDiastolic !== null && (
          <g>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={getY(avgDiastolic)}
              y2={getY(avgDiastolic)}
              stroke="#a78bfa"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <text
              x={width - padding.right - 5}
              y={getY(avgDiastolic) - 4}
              textAnchor="end"
              fontSize="8"
              fill="#a78bfa"
              opacity="0.8"
            >
              7d Avg Dia ({avgDiastolic})
            </text>
          </g>
        )}

        {/* Systolic Line */}
        <path d={systolicPath} fill="none" stroke="#38bdf8" strokeWidth="2" />
        {sortedData.map(d => (
          <circle 
            key={`sys-${d.timestamp}`} 
            cx={getX(d.timestamp)} 
            cy={getY(d.systolic)} 
            r={activePoint?.timestamp === d.timestamp ? 5 : 3} 
            fill="#38bdf8" 
            stroke={activePoint?.timestamp === d.timestamp ? "white" : "black"} 
            strokeWidth="1" 
            style={{transition: 'r 0.2s ease'}}
          />
        ))}

        {/* Diastolic Line */}
        <path d={diastolicPath} fill="none" stroke="#a78bfa" strokeWidth="2" />
        {sortedData.map(d => (
          <circle 
            key={`dia-${d.timestamp}`} 
            cx={getX(d.timestamp)} 
            cy={getY(d.diastolic)} 
            r={activePoint?.timestamp === d.timestamp ? 5 : 3} 
            fill="#a78bfa" 
            stroke={activePoint?.timestamp === d.timestamp ? "white" : "black"} 
            strokeWidth="1" 
            style={{transition: 'r 0.2s ease'}}
          />
        ))}
      </svg>
      <div className="flex justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#38bdf8]"></div>
              <span>Systolic {has7DayReadings && <span className="text-gray-400 text-[10px] ml-1">(7d avg line: --)</span>}</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#a78bfa]"></div>
              <span>Diastolic {has7DayReadings && <span className="text-gray-400 text-[10px] ml-1">(7d avg line: --)</span>}</span>
          </div>
      </div>
      {activePoint && (
          <div
              id="bp-history-tooltip"
              style={tooltipStyle}
              className="bg-slate-800/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl text-xs border border-white/20 z-10 pointer-events-none transition-opacity duration-200"
          >
              <p className="font-bold mb-1">{new Date(activePoint.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-gray-300 text-[10px] -mt-1 mb-2">{new Date(activePoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                  <span className="text-cyan-400 font-semibold">Systolic:</span>
                  <span className="text-right">{activePoint.systolic}</span>
                  <span className="text-purple-400 font-semibold">Diastolic:</span>
                  <span className="text-right">{activePoint.diastolic}</span>
                  <span className="font-semibold">Pulse:</span>
                  <span className="text-right">{activePoint.pulse}</span>
              </div>
          </div>
      )}
    </div>
  );
};