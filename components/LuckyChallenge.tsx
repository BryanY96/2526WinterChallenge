import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, User, Lock, Clock, Camera, Loader2 } from 'lucide-react';

interface LuckyChallengeProps {
  currentWeekRunners: string[];
  weekId: string; // e.g., "W1", "W2"
  onUploadClick: () => void;
}

// Pseudo-random number generator seeded string (Simple Linear Congruential Generator)
const seededRandom = (seed: number) => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

// Generate a numeric seed from a string (e.g. "W5")
const getSeedFromString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
};

export const LuckyChallenge: React.FC<LuckyChallengeProps> = ({ currentWeekRunners, weekId, onUploadClick }) => {
  const [winners, setWinners] = useState<string[]>([]);
  const [assignedTask, setAssignedTask] = useState<string>("");
  const [challengePool, setChallengePool] = useState<string[]>([]);
  const [isPoolLoading, setIsPoolLoading] = useState(true);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Loading...");

  // 1. Fetch Challenge Pool from text file
  useEffect(() => {
      const loadChallenges = async () => {
          try {
              const response = await fetch('ChallengesPool.txt');
              if (response.ok) {
                  const text = await response.text();
                  // Split by newline, trim whitespace, and remove empty lines
                  const tasks = text.split('\n')
                      .map(line => line.trim())
                      .filter(line => line.length > 0 && !line.startsWith('#')); // Ignore empty lines and comments
                  
                  if (tasks.length > 0) {
                      setChallengePool(tasks);
                  } else {
                      console.warn("ChallengesPool.txt is empty.");
                      setChallengePool(["Core Training: 1 Minute Plank (Default)"]);
                  }
              } else {
                  console.error("Failed to fetch ChallengesPool.txt");
                  setChallengePool(["Core Training: 1 Minute Plank (Fallback)"]);
              }
          } catch (error) {
              console.error("Error loading challenge pool:", error);
              setChallengePool(["Core Training: 1 Minute Plank (Fallback)"]);
          } finally {
              setIsPoolLoading(false);
          }
      };

      loadChallenges();
  }, []);

  // Deterministically pick winners and task based on weekId
  // Now relies on challengePool state
  const performDeterministicDraw = () => {
    if (!currentWeekRunners || currentWeekRunners.length < 3) return null;
    if (challengePool.length === 0) return null;

    // 1. Sort runners to ensure pool order is identical for everyone
    const sortedRunners = [...currentWeekRunners].sort();
    
    // 2. Generate Seed from WeekID (e.g., "W2")
    // Use the current year to avoid collisions next year if format stays same
    const baseSeed = getSeedFromString(`${weekId}-2025`); 

    const resultWinners: string[] = [];
    const usedIndices = new Set<number>();
    
    // 3. Pick 3 distinct winners
    let rngStep = 0;
    while(resultWinners.length < 3) {
        const rand = seededRandom(baseSeed + rngStep);
        const idx = Math.floor(rand * sortedRunners.length);
        
        if (!usedIndices.has(idx)) {
            usedIndices.add(idx);
            resultWinners.push(sortedRunners[idx]);
        }
        rngStep++;
    }

    // 4. Pick 1 Task from the loaded pool
    const taskRand = seededRandom(baseSeed + 999);
    const taskIdx = Math.floor(taskRand * challengePool.length);
    
    return {
        winners: resultWinners,
        task: challengePool[taskIdx]
    };
  };

  // 2. Main Logic Effect (Wait for pool to load before running logic)
  useEffect(() => {
      if (!weekId || isPoolLoading) {
          setStatusMessage(isPoolLoading ? "Loading Challenges..." : "Waiting for data...");
          return;
      }

      // Check EST Time
      const checkTime = () => {
          // Create date object for EST
          const now = new Date();
          const estTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
          const estDate = new Date(estTimeStr);
          
          const day = estDate.getDay(); // 0 = Sunday, 1 = Monday, ... 5 = Friday, 6 = Saturday
          const hour = estDate.getHours(); // 0-23
          
          // --- RULES ---
          // 1. Temporary Test Window: Friday 6 PM EST onwards (Friday 18:00+ or Saturday)
          const isTestWindow = (day === 5 && hour >= 18) || (day === 6);

          // 2. Official Window: Sunday 8 PM EST to Monday 12 AM EST (Sunday 20:00 - 23:59)
          const isOfficialWindow = (day === 0 && hour >= 20);

          const isOpen = isTestWindow || isOfficialWindow;

          if (isOpen) {
              setIsUnlocked(true);
              setStatusMessage("Ready to Draw");
          } else {
              setIsUnlocked(false);
              setStatusMessage("Draw Opens: Sunday 8PM EST, Close: Monday 12AM EST");
          }
      };

      checkTime();
      const timer = setInterval(checkTime, 60000); // Check every minute
      
      // Check if already "drawn" locally for animation purposes
      const hasSeen = localStorage.getItem(`seen_draw_${weekId}`);
      if (hasSeen) {
          // Re-calculate results to ensure consistency
          // Now safe to call because isPoolLoading is false
          const result = performDeterministicDraw();
          if (result) {
            setWinners(result.winners);
            setAssignedTask(result.task);
          }
      }

      return () => clearInterval(timer);
  }, [weekId, currentWeekRunners, isPoolLoading, challengePool]); // Add pool dependencies

  const handleDraw = () => {
    if (isDrawing || !isUnlocked) return;
    
    const result = performDeterministicDraw();
    if (!result) {
        alert("Not enough runners active this week to draw, or challenge pool failed to load.");
        return;
    }

    setIsDrawing(true);
    
    // Animation Sequence
    let shuffleCount = 0;
    const maxShuffles = 15;
    
    const shuffleInterval = setInterval(() => {
        shuffleCount++;
        // Show fake random names during animation
        const tempWinners: string[] = [];
        for(let i=0; i<3; i++) {
            const r = Math.floor(Math.random() * currentWeekRunners.length);
            tempWinners.push(currentWeekRunners[r]);
        }
        setWinners(tempWinners);

        if (shuffleCount >= maxShuffles) {
            clearInterval(shuffleInterval);
            // Reveal deterministic result
            setWinners(result.winners);
            setAssignedTask(result.task);
            setIsDrawing(false);
            // Save state so we don't animate again this week
            localStorage.setItem(`seen_draw_${weekId}`, "true");
        }
    }, 100);
  };

  const hasResult = winners.length > 0 && !isDrawing;

  return (
    <section className="bg-slate-800 rounded-2xl p-6 border border-amber-500/20 shadow-lg relative overflow-hidden min-h-[300px]">
        {/* Background Decors */}
        <div className="absolute -right-10 -top-10 text-amber-500/5 rotate-12">
            <Gift size={150} />
        </div>

        <div className="relative z-10">
            <h2 className="text-2xl font-bold text-center mb-1 text-amber-400 flex items-center justify-center gap-2">
                <Sparkles size={20} className="text-amber-200" />
                本周加练挑战 ({weekId})
                <Sparkles size={20} className="text-amber-200" />
            </h2>
            <p className="text-center text-slate-400 text-sm mb-6">Lucky Musketeers</p>

            {/* Winner Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[0, 1, 2].map((i) => (
                    <div key={i} className={`
                        aspect-[3/4] rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all duration-300
                        ${winners.length > i ? 'bg-gradient-to-b from-red-600 to-red-800 border-amber-400 transform scale-105' : 'bg-slate-700 border-slate-600'}
                        border-2 shadow-inner
                    `}>
                        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center mb-2">
                            <User size={20} className="text-white/80" />
                        </div>
                        <span className={`text-sm font-bold truncate w-full ${winners.length > i ? 'text-white' : 'text-slate-500'}`}>
                            {winners[i] || "?"}
                        </span>
                    </div>
                ))}
            </div>

            {/* Action Area */}
            <div className="text-center space-y-4">
                {hasResult ? (
                    <div className="animate-fadeIn">
                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-4">
                            <p className="text-amber-300 text-xs uppercase tracking-wider font-bold mb-1">Challenge Mission</p>
                            <p className="text-lg font-bold text-white">{assignedTask}</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        {!isUnlocked || isPoolLoading ? (
                            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed">
                                {isPoolLoading ? <Loader2 size={18} className="animate-spin" /> : <Clock size={18} />}
                                <span>{statusMessage}</span>
                            </div>
                        ) : (
                            <button 
                                onClick={handleDraw}
                                disabled={isDrawing}
                                className={`
                                    px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
                                    bg-amber-500 hover:bg-amber-400 text-slate-900 hover:shadow-amber-500/25 active:scale-95
                                    ${isDrawing ? 'opacity-80 cursor-wait' : ''}
                                `}
                            >
                                {isDrawing ? "Drawing..." : "✨ 抽取幸运跑友 ✨"}
                            </button>
                        )}
                         
                         {/* Info Text */}
                         <div className="mt-4 flex flex-col items-center gap-1">
                            {!isUnlocked && !isPoolLoading && (
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Lock size={12} /> Results are locked until Sunday 8 PM EST.
                                </p>
                            )}
                            {isUnlocked && !hasResult && !isPoolLoading && (
                                <p className="text-xs text-slate-500">
                                    Draw is open! Results are final for the week.
                                </p>
                            )}
                         </div>
                    </div>
                )}
            </div>

            {/* Footer Upload Action (Always visible) */}
            <div className="mt-8 pt-4 border-t border-slate-700/50">
               <button 
                  onClick={onUploadClick}
                  className="w-full bg-slate-900/50 hover:bg-slate-700/80 border border-slate-600 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all group"
               >
                  <Camera size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
                    📢 请幸运跑友上传视频！
                  </span>
               </button>
            </div>
        </div>
    </section>
  );
};
