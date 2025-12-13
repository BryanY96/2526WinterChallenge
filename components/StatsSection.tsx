import React from 'react';
import { Footprints, TrendingUp } from 'lucide-react';

interface StatsSectionProps {
  totalDistance: number;
  goalDistance: number;
  activeRunnersCount: number;
  distanceThisWeek: number;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ totalDistance, goalDistance, activeRunnersCount, distanceThisWeek }) => {
  const percentage = Math.min(100, (totalDistance / goalDistance) * 100).toFixed(1);

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card 1: Main Progress */}
      <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Distance</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold text-white">{totalDistance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span className="text-slate-500">/ {goalDistance.toLocaleString()} km</span>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-3xl font-bold text-amber-400">{percentage}%</span>
            <span className="text-xs text-slate-500">Completed</span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="relative h-6 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600">
            {/* The Bar */}
            <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full animate-stripe shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
            >
                {/* Glare effect */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20"></div>
            </div>
        </div>
        
        <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
            <span>Washington DC</span>
            <span>Mohe (China)</span>
        </div>
      </div>

      {/* Mini Stats 1 */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
        <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
            <Footprints size={24} />
        </div>
        <div>
            <p className="text-xs text-slate-400 uppercase">Active Runners This Week</p>
            <p className="text-xl font-bold">{activeRunnersCount}</p>
        </div>
      </div>

      {/* Mini Stats 2: Distance This Week */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
        <div className="p-3 bg-red-500/10 rounded-full text-red-400">
            <TrendingUp size={24} />
        </div>
        <div>
            <p className="text-xs text-slate-400 uppercase">Distance This Week</p>
            <p className="text-xl font-bold">{distanceThisWeek.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-normal text-slate-500">km</span></p>
        </div>
      </div>
    </section>
  );
};