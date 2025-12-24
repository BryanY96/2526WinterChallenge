import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, TrendingUp, Zap } from 'lucide-react';
import { RunnerData } from '../App';
import { Period } from './Leaderboard';

// START_DATE from App.tsx: Dec 15, 2025
const START_DATE = new Date('2025-12-15T00:00:00');

interface RunnerDetailModalProps {
  runner: RunnerData | null;
  periods: Period[];
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get week number from weekId (e.g., "W1" -> 1)
const getWeekNumber = (weekId: string | undefined): number => {
  if (!weekId) return 0;
  const match = weekId.match(/^W(\d+)$/i);
  return match ? parseInt(match[1]) : 0;
};

// Helper to get day index (0=Monday, 6=Sunday)
const getDayIndex = (dayKey: string): number | null => {
  const lowerKey = dayKey.toLowerCase();
  
  // Chinese days
  if (dayKey.includes('周一') || lowerKey.includes('mon')) return 0;
  if (dayKey.includes('周二') || lowerKey.includes('tue')) return 1;
  if (dayKey.includes('周三') || lowerKey.includes('wed')) return 2;
  if (dayKey.includes('周四') || lowerKey.includes('thu')) return 3;
  if (dayKey.includes('周五') || lowerKey.includes('fri')) return 4;
  if (dayKey.includes('周六') || lowerKey.includes('sat')) return 5;
  if (dayKey.includes('周日') || lowerKey.includes('sun')) return 6;
  
  return null;
};

// Helper to get English day name
const getEnglishDayName = (dayKey: string): string | null => {
  const dayIndex = getDayIndex(dayKey);
  if (dayIndex === null) return null;
  
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return dayNames[dayIndex];
};

// Helper to calculate date for a specific week and day
const getDateForWeekDay = (weekId: string | undefined, dayIndex: number): string => {
  if (!weekId) return '';
  
  const match = weekId.match(/^W(\d+)$/i);
  if (!match) return '';
  
  const weekNum = parseInt(match[1]);
  
  // Calculate week start (Monday of that week)
  // START_DATE is Dec 15, 2025, which is a Monday
  const weekStart = new Date(START_DATE);
  weekStart.setDate(START_DATE.getDate() + (weekNum - 1) * 7);
  
  // Calculate the date for the specific day (Monday = 0, Sunday = 6)
  const targetDate = new Date(weekStart);
  targetDate.setDate(weekStart.getDate() + dayIndex);
  
  // Format as M/D
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  return `${month}/${day}`;
};

// Helper to format day name for display: "Mon 12/15"
const formatDayName = (dayKey: string, weekId: string | undefined): string => {
  // Check if it's already a date format
  if (/^\d{1,2}[\/\-]\d{1,2}/.test(dayKey)) {
    return dayKey; // Return as is if it's already a date
  }
  
  const dayIndex = getDayIndex(dayKey);
  const englishDayName = getEnglishDayName(dayKey);
  
  if (dayIndex !== null && englishDayName && weekId) {
    const date = getDateForWeekDay(weekId, dayIndex);
    return date ? `${englishDayName} ${date}` : englishDayName;
  }
  
  // Fallback: return the key as is
  return dayKey;
};

// Sort day keys in order: Mon -> Sun
const sortDayKeys = (keys: string[]): string[] => {
  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  
  return keys.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    let aIndex = dayOrder.findIndex(day => aLower.includes(day.toLowerCase()));
    let bIndex = dayOrder.findIndex(day => bLower.includes(day.toLowerCase()));
    
    // If not found in dayOrder, check if it's a date format (put at end)
    if (aIndex === -1) aIndex = 999;
    if (bIndex === -1) bIndex = 999;
    
    return aIndex - bIndex;
  });
};

export const RunnerDetailModal: React.FC<RunnerDetailModalProps> = ({ 
  runner, 
  periods, 
  isOpen, 
  onClose 
}) => {
  // Find all weeks where this runner has data
  const runnerWeeks = useMemo(() => {
    if (!runner) return [];
    
    const weeks: Array<{ period: Period; runnerData: RunnerData; weekNum: number }> = [];
    
    periods.forEach(period => {
      if (period.label === 'Total Distance' || !period.weekId) return; // Skip total view
      
      const runnerInPeriod = period.runners.find(r => r.name === runner.name);
      if (runnerInPeriod && period.weekId) {
        weeks.push({
          period,
          runnerData: runnerInPeriod,
          weekNum: getWeekNumber(period.weekId)
        });
      }
    });
    
    // Sort by week number (descending: latest first)
    return weeks.sort((a, b) => b.weekNum - a.weekNum);
  }, [runner, periods]);
  
  // Current week index (starts at 0 = latest week)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  
  // Reset to latest week when runner changes
  React.useEffect(() => {
    setCurrentWeekIndex(0);
  }, [runner?.name]);
  
  if (!isOpen || !runner || runnerWeeks.length === 0) {
    return null;
  }
  
  const currentWeek = runnerWeeks[currentWeekIndex];
  const dailyRecords = currentWeek.runnerData.dailyRecords || {};
  const sortedDayKeys = sortDayKeys(Object.keys(dailyRecords));
  const weekId = currentWeek.period.weekId;
  
  // Calculate stats
  const totalDistance = currentWeek.runnerData.rawDistance || 0;
  const hasStreak = currentWeek.runnerData.hasStreak || false;
  const finalDistance = currentWeek.runnerData.distance || 0;
  const bonusDistance = currentWeek.runnerData.bonusDistance || 0;
  
  // Count active days
  const activeDays = Object.values(dailyRecords).filter(d => d > 0).length;
  
  const canGoPrev = currentWeekIndex < runnerWeeks.length - 1;
  const canGoNext = currentWeekIndex > 0;
  
  const goToPrevWeek = () => {
    if (canGoPrev) {
      setCurrentWeekIndex(prev => prev + 1);
    }
  };
  
  const goToNextWeek = () => {
    if (canGoNext) {
      setCurrentWeekIndex(prev => prev - 1);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/30 to-amber-900/30 p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-xl font-bold text-amber-400">
                {runner.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{runner.name}</h2>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                <Calendar size={14} />
                {currentWeek.period.label}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Week Navigation */}
        {runnerWeeks.length > 1 && (
          <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
            <button
              onClick={goToPrevWeek}
              disabled={!canGoPrev}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                canGoPrev 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">上一周</span>
            </button>
            
            <div className="text-center">
              <span className="text-xs text-slate-400 block">Week {currentWeek.weekNum}</span>
              <span className="text-sm font-bold text-amber-400">
                {currentWeekIndex + 1} / {runnerWeeks.length}
              </span>
            </div>
            
            <button
              onClick={goToNextWeek}
              disabled={!canGoNext}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                canGoNext 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <span className="text-sm font-medium">下一周</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-400 uppercase mb-1">原始距离</p>
              <p className="text-xl font-bold text-white">{totalDistance.toFixed(1)} km</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-400 uppercase mb-1">活跃天数</p>
              <p className="text-xl font-bold text-amber-400">{activeDays} 天</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-400 uppercase mb-1 flex items-center gap-1">
                {hasStreak && <Zap size={12} className="text-yellow-400" />}
                最终距离
              </p>
              <p className="text-xl font-bold text-green-400">{finalDistance.toFixed(1)} km</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-400 uppercase mb-1">连击奖励</p>
              <p className="text-xl font-bold text-yellow-400">
                {hasStreak ? `+${bonusDistance.toFixed(1)} km` : '无'}
              </p>
            </div>
          </div>
          
          {/* Daily Records */}
          <div className="bg-slate-900/30 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-400" />
              每日记录
            </h3>
            
            {sortedDayKeys.length > 0 ? (
              <div className="space-y-3">
                {sortedDayKeys.map((dayKey, index) => {
                  const distance = dailyRecords[dayKey] || 0;
                  const isActive = distance > 0;
                  
                  return (
                    <div
                      key={dayKey}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-slate-800/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700 text-slate-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-slate-200">
                          {formatDayName(dayKey, weekId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="text-xs text-green-400 font-bold">✓</span>
                        )}
                        <span className={`font-bold text-lg ${
                          isActive ? 'text-green-400' : 'text-slate-500'
                        }`}>
                          {distance.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>本周暂无每日记录</p>
              </div>
            )}
          </div>
          
          {/* Bonus Info */}
          {hasStreak && (
            <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-sm text-amber-300 flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" />
                <span>
                  <strong>连击奖励激活！</strong> 本周有 {activeDays} 天有跑步记录，获得 1.2x 距离加成
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

