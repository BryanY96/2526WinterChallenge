import React, { useState } from 'react';
import { Trophy, Medal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Crown, Flame } from 'lucide-react';

interface Runner {
  name: string;
  distance: number;
  hasStreak?: boolean; // >= 5 runs in a specific week
  isPerfect?: boolean; // Maintained streak every single week
}

export interface Period {
    label: string;
    runners: Runner[];
}

interface LeaderboardProps {
  periods: Period[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ periods }) => {
  const [showAll, setShowAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Safety check
  if (!periods || periods.length === 0) {
      return (
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-slate-500">
            Loading ranking data...
        </section>
      );
  }

  const currentPeriod = periods[currentIndex];
  const isTotalView = currentIndex === 0;
  
  // Show top 5 by default, or all if expanded
  const displayCount = showAll ? currentPeriod.runners.length : 5;
  const displayedRunners = currentPeriod.runners.slice(0, displayCount);

  // Handlers for navigation
  const goNext = () => {
    if (currentIndex < periods.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAll(false); // Reset expansion when changing views
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setShowAll(false);
    }
  };

  return (
    <section className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden transition-all duration-300">
        <div className="bg-red-900/20 p-4 border-b border-red-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-400" />
                <h3 className="font-bold text-lg text-red-100">光荣榜</h3>
            </div>
            
            {/* Period Navigation */}
            <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                <button 
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className={`p-1 rounded hover:bg-slate-700 transition-colors ${currentIndex === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300'}`}
                >
                    <ChevronLeft size={18} />
                </button>
                
                <div className="px-2 min-w-[120px] text-center">
                    <span className="text-xs font-mono text-amber-500 block leading-tight">
                        {isTotalView ? "TOTAL" : "WEEKLY"}
                    </span>
                    <span className="text-sm font-bold text-slate-200 block leading-tight truncate max-w-[140px]">
                        {currentPeriod.label}
                    </span>
                </div>

                <button 
                    onClick={goNext}
                    disabled={currentIndex === periods.length - 1}
                    className={`p-1 rounded hover:bg-slate-700 transition-colors ${currentIndex === periods.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300'}`}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
        
        <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-700">
                        <th className="px-4 py-3 font-medium w-16">Rank</th>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium text-right">Distance (km)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                    {displayedRunners.length > 0 ? (
                        displayedRunners.map((runner, index) => {
                            const rank = index + 1;
                            return (
                                <tr key={`${runner.name}-${index}`} className="hover:bg-slate-700/30 transition-colors animate-fadeIn">
                                    <td className="px-4 py-3">
                                        {rank === 1 && <Medal size={20} className="text-yellow-400 drop-shadow-sm" />}
                                        {rank === 2 && <Medal size={20} className="text-slate-400 drop-shadow-sm" />}
                                        {rank === 3 && <Medal size={20} className="text-amber-700 drop-shadow-sm" />}
                                        {rank > 3 && <span className="font-mono text-slate-500 w-5 inline-block text-center">{rank}</span>}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-200 flex items-center gap-2">
                                        <span>{runner.name}</span>
                                        
                                        {/* --- Weekly Streak: Flame with Pulse --- */}
                                        {!isTotalView && runner.hasStreak && (
                                            <div title="Weekly Streak: 5+ Runs!" className="ml-1">
                                                <Flame 
                                                    size={16} 
                                                    className="text-orange-500 animate-pulse drop-shadow-[0_0_5px_rgba(249,115,22,0.6)]" 
                                                    fill="currentColor" 
                                                />
                                            </div>
                                        )}

                                        {/* --- Perfect Streak: Crown with Gold Glow --- */}
                                        {isTotalView && runner.isPerfect && (
                                            <div title="Perfect Streak: 5+ Runs every week!" className="ml-1">
                                                <Crown 
                                                    size={16} 
                                                    className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" 
                                                    fill="currentColor" 
                                                />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-amber-500">
                                        {runner.distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-slate-500 italic">
                                No running data for this period.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {currentPeriod.runners.length > 5 && (
            <div className="p-3 text-center border-t border-slate-700">
                <button 
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 w-full uppercase tracking-wider"
                >
                    {showAll ? (
                        <>Show Less <ChevronUp size={14}/></>
                    ) : (
                        <>View Full List ({currentPeriod.runners.length}) <ChevronDown size={14}/></>
                    )}
                </button>
            </div>
        )}
    </section>
  );
};