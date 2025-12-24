import React, { useState } from 'react';
import { Trophy, Medal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Crown, Flame, Zap } from 'lucide-react';
import { RunnerData } from '../App';
import { RunnerDetailModal } from './RunnerDetailModal';

export interface Period {
    label: string;
    runners: RunnerData[];
    weekId?: string; // Week identifier (e.g., "W1", "W2")
}

interface LeaderboardProps {
  periods: Period[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ periods }) => {
  const [showAll, setShowAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRunner, setSelectedRunner] = useState<RunnerData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!periods || periods.length === 0) {
      return (
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-slate-500">
            Loading ranking data...
        </section>
      );
  }

  const currentPeriod = periods[currentIndex];
  const isTotalView = currentIndex === 0;
  
  const displayCount = showAll ? currentPeriod.runners.length : 5;
  const displayedRunners = currentPeriod.runners.slice(0, displayCount);

  const goNext = () => {
    if (currentIndex < periods.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAll(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setShowAll(false);
    }
  };

  const handleRunnerClick = (runner: RunnerData) => {
    setSelectedRunner(runner);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRunner(null);
  };

  return (
    <section className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden transition-all duration-300">
        <div className="bg-red-900/20 p-4 border-b border-red-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-400" />
                <h3 className="font-bold text-lg text-red-100">光荣榜</h3>
            </div>
            
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
                            const streakCount = runner.streakCount || 0;
                            const isElite = streakCount >= 7;

                            return (
                                <tr 
                                    key={`${runner.name}-${index}`} 
                                    className="hover:bg-slate-700/30 transition-colors animate-fadeIn cursor-pointer"
                                    onClick={() => handleRunnerClick(runner)}
                                >
                                    <td className="px-4 py-3">
                                        {rank === 1 && <Medal size={20} className="text-yellow-400 drop-shadow-sm" />}
                                        {rank === 2 && <Medal size={20} className="text-slate-400 drop-shadow-sm" />}
                                        {rank === 3 && <Medal size={20} className="text-amber-700 drop-shadow-sm" />}
                                        {rank > 3 && <span className="font-mono text-slate-500 w-5 inline-block text-center">{rank}</span>}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-200">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span>{runner.name}</span>
                                                {/* --- Total View Streak UI --- */}
                                                {isTotalView && (
                                                    <div className="flex items-center gap-0.5">
                                                        {isElite ? (
                                                            <div title="Elite Achievement: 7+ Streaks!" className="animate-bounce">
                                                                <Crown 
                                                                    size={18} 
                                                                    className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,1)]" 
                                                                    fill="currentColor" 
                                                                />
                                                            </div>
                                                        ) : (
                                                            Array.from({ length: streakCount }).map((_, i) => (
                                                                <Flame 
                                                                    key={i}
                                                                    size={14} 
                                                                    className="text-orange-500 drop-shadow-[0_0_3px_rgba(249,115,22,0.4)]" 
                                                                    fill="currentColor" 
                                                                />
                                                            ))
                                                        )}
                                                    </div>
                                                )}

                                                {/* --- Weekly View Streak Indicator --- */}
                                                {!isTotalView && runner.hasStreak && (
                                                    <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                                                )}
                                            </div>
                                            {isTotalView && streakCount > 0 && (
                                                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                                    {streakCount} 连击{streakCount > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-amber-500 text-base">
                                                {runner.distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                            </span>
                                            
                                            {/* --- Bonus Breakdown in Weekly View --- */}
                                            {!isTotalView && runner.hasStreak && runner.bonusDistance && runner.rawDistance && (
                                                <div className="flex items-center gap-1 text-[10px] text-green-500 font-bold whitespace-nowrap">
                                                    <span>{runner.rawDistance.toFixed(1)}</span>
                                                    <span className="opacity-60">+</span>
                                                    <div className="flex items-center">
                                                        <Zap size={8} />
                                                        <span>{runner.bonusDistance.toFixed(1)}</span>
                                                    </div>
                                                    <span className="bg-green-500/10 px-1 rounded text-[9px] border border-green-500/20">1.2x</span>
                                                </div>
                                            )}
                                        </div>
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
        
        {/* Runner Detail Modal */}
        <RunnerDetailModal
            runner={selectedRunner}
            periods={periods}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
        />
    </section>
  );
};
