import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, User, Lock, Clock, Camera, Loader2 } from 'lucide-react';

interface LuckyChallengeProps {
  currentWeekRunners: string[];
  weekId: string; // e.g., "W1", "W2"
  onUploadClick: () => void;
  spreadsheetId?: string;
  luckyDrawScriptUrl?: string;
  luckyDrawSheetName?: string;
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

export const LuckyChallenge: React.FC<LuckyChallengeProps> = ({ 
  currentWeekRunners, 
  weekId, 
  onUploadClick,
  spreadsheetId,
  luckyDrawScriptUrl,
  luckyDrawSheetName = 'Lucky Results'
}) => {
  const [winners, setWinners] = useState<string[]>([]);
  const [assignedTask, setAssignedTask] = useState<string>("");
  const [challengePool, setChallengePool] = useState<string[]>([]);
  const [usedTasks, setUsedTasks] = useState<string[]>([]); // Track used challenges
  const [isPoolLoading, setIsPoolLoading] = useState(true);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Loading...");
  
  // Helper: Save draw result to Google Sheets
  const saveDrawResultToSheet = async (weekId: string, winners: string[], task: string) => {
    if (!luckyDrawScriptUrl) {
      console.warn('[LuckyChallenge] Lucky Draw Script URL not configured, skipping save to sheet');
      return;
    }
    
    // Validate inputs
    if (!weekId || !winners || winners.length !== 3 || !task) {
      console.error('[LuckyChallenge] Invalid draw result data:', { weekId, winners, task });
      return;
    }
    
    try {
      const payload = {
        action: 'saveDrawResult',
        weekId: weekId,
        winners: winners,
        task: task
      };
      
      console.log('[LuckyChallenge] Attempting to save draw result to sheet:', payload);
      
      // Note: Using 'no-cors' mode means we can't see the response, but the request should still succeed
      // The Google Apps Script will handle the write operation server-side
      const response = await fetch(luckyDrawScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 
          'Content-Type': 'text/plain' 
        },
        body: JSON.stringify(payload)
      });
      
      // With no-cors mode, we can't check response.ok, but we can log that the request was sent
      console.log('[LuckyChallenge] ✅ Draw result save request sent to sheet:', { weekId, winners, task });
      
      // Verify the save by attempting to read it back after a short delay
      // This is a best-effort verification since no-cors prevents reading the response
      setTimeout(async () => {
        try {
          if (spreadsheetId && luckyDrawSheetName) {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(luckyDrawSheetName)}`;
            const csvResponse = await fetch(csvUrl);
            if (csvResponse.ok) {
              const csvText = await csvResponse.text();
              const lines = csvText.split('\n').filter(line => line.trim());
              if (lines.length > 1) {
                const headers = lines[0].split(',');
                const weekIdIndex = headers.findIndex(h => /week|id/i.test(h));
                if (weekIdIndex >= 0) {
                  const normalizedWeekId = weekId.replace(/^W/i, '');
                  for (let i = 1; i < lines.length; i++) {
                    const row = lines[i].split(',');
                    const rowWeekId = row[weekIdIndex]?.trim().replace(/"/g, '');
                    if (rowWeekId && (
                      rowWeekId === weekId || 
                      rowWeekId === normalizedWeekId ||
                      rowWeekId.replace(/^W/i, '') === normalizedWeekId
                    )) {
                      console.log('[LuckyChallenge] ✅ Verified: Draw result successfully saved to sheet');
                      return;
                    }
                  }
                  console.warn('[LuckyChallenge] ⚠️ Could not verify save: Result not found in sheet (may need more time to propagate)');
                }
              }
            }
          }
        } catch (verifyError) {
          console.warn('[LuckyChallenge] ⚠️ Could not verify save:', verifyError);
        }
      }, 2000); // Wait 2 seconds before verification
      
    } catch (error) {
      console.error('[LuckyChallenge] ❌ Failed to save draw result to sheet:', error);
      // Note: With no-cors mode, network errors might not be caught
      // The error could be due to network issues or script configuration
    }
  };
  
  // Helper: Load previous draw results from Google Sheets
  const loadPreviousDrawResults = async (weekId: string) => {
    if (!luckyDrawScriptUrl || !weekId) return null;
    
    try {
      // Try to load previous week's result (for display before current week draw)
      const prevWeekMatch = weekId.match(/^W(\d+)$/i);
      if (!prevWeekMatch) return null;
      
      const currentWeekNum = parseInt(prevWeekMatch[1]);
      if (currentWeekNum <= 1) return null; // No previous week for W1
      
      const prevWeekId = `W${currentWeekNum - 1}`;
      
      // Try fetching via Google Apps Script API
      const url = `${luckyDrawScriptUrl}?weekId=${encodeURIComponent(prevWeekId)}`;
      const response = await fetch(url, { mode: 'cors' });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data;
        }
      }
    } catch (error) {
      console.warn('Failed to load previous draw results:', error);
      // Fallback: try direct CSV fetch if spreadsheet ID is available
      if (spreadsheetId && luckyDrawSheetName) {
        try {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(luckyDrawSheetName)}`;
          const csvResponse = await fetch(csvUrl);
          if (csvResponse.ok) {
            const csvText = await csvResponse.text();
            // Parse CSV and find previous week's result
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length > 1) {
              const headers = lines[0].split(',');
              const weekIdIndex = headers.findIndex(h => /week|id/i.test(h));
              
              if (weekIdIndex >= 0) {
                // Find previous week
                const prevWeekMatch = weekId.match(/^W(\d+)$/i);
                if (prevWeekMatch) {
                  const currentWeekNum = parseInt(prevWeekMatch[1]);
                  if (currentWeekNum > 1) {
                    const prevWeekId = `W${currentWeekNum - 1}`;
                    
                    for (let i = 1; i < lines.length; i++) {
                      const row = lines[i].split(',');
                      const rowWeekId = row[weekIdIndex]?.trim().replace(/"/g, ''); // Remove quotes if present
                      const normalizedPrevWeekId = prevWeekId.replace(/^W/i, ''); // Normalize "W2" -> "2"
                      // Match both "W2" format and "2" format
                      if (rowWeekId && (
                          rowWeekId === prevWeekId ||
                          rowWeekId === normalizedPrevWeekId ||
                          rowWeekId.replace(/^W/i, '') === normalizedPrevWeekId
                      )) {
                        // Found previous week's result
                        return {
                          weekId: prevWeekId,
                          winners: [
                            row[1]?.trim().replace(/"/g, '') || '', 
                            row[2]?.trim().replace(/"/g, '') || '', 
                            row[3]?.trim().replace(/"/g, '') || ''
                          ],
                          task: row[4]?.trim().replace(/"/g, '') || ''
                        };
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (csvError) {
          console.warn('Failed to load via CSV fallback:', csvError);
        }
      }
    }
    
    return null;
  };
  
  // Helper: Load all used tasks from Google Sheets
  const loadUsedTasks = async () => {
    if (!spreadsheetId || !luckyDrawSheetName) return [];
    
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(luckyDrawSheetName)}`;
      const csvResponse = await fetch(csvUrl);
      if (csvResponse.ok) {
        const csvText = await csvResponse.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length > 1) {
          const headers = lines[0].split(',');
          const taskIndex = headers.findIndex(h => /task|项目|challenge/i.test(h));
          
          if (taskIndex >= 0) {
            const used: string[] = [];
            for (let i = 1; i < lines.length; i++) {
              const row = lines[i].split(',');
              const task = row[taskIndex]?.trim().replace(/"/g, ''); // Remove quotes if present
              if (task && !used.includes(task)) {
                used.push(task);
              }
            }
            return used;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load used tasks:', error);
    }
    
    return [];
  };

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
      
      // Load used tasks from Google Sheets
      if (spreadsheetId && luckyDrawSheetName) {
        loadUsedTasks().then(used => {
          setUsedTasks(used);
        });
      }
  }, [spreadsheetId, luckyDrawSheetName]);

  // Deterministically pick winners and task based on weekId
  // Now relies on challengePool state and excludes used tasks
  const performDeterministicDraw = () => {
    if (!currentWeekRunners || currentWeekRunners.length < 3) return null;
    if (challengePool.length === 0) return null;

    // 1. Filter out used tasks
    const availableTasks = challengePool.filter(task => !usedTasks.includes(task));
    // If all tasks are used, use all tasks as fallback (could happen if pool is smaller than weeks)
    if (availableTasks.length === 0) {
      console.warn("All challenges have been used, will use all tasks from pool");
    }

    // 2. Sort runners to ensure pool order is identical for everyone
    const sortedRunners = [...currentWeekRunners].sort();
    
    // 3. Generate Seed from WeekID (e.g., "W2")
    // Use the current year to avoid collisions next year if format stays same
    const baseSeed = getSeedFromString(`${weekId}-2025`); 

    const resultWinners: string[] = [];
    const usedIndices = new Set<number>();
    
    // 4. Pick 3 distinct winners
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

    // 5. Pick 1 Task from available tasks (excluding used ones)
    const tasksToUse = availableTasks.length > 0 ? availableTasks : challengePool;
    const taskRand = seededRandom(baseSeed + 999);
    const taskIdx = Math.floor(taskRand * tasksToUse.length);
    
    return {
        winners: resultWinners,
        task: tasksToUse[taskIdx]
    };
  };

  // 2. Main Logic Effect (Wait for pool to load before running logic)
  useEffect(() => {
      if (!weekId || isPoolLoading) {
          setStatusMessage(isPoolLoading ? "Loading Challenges..." : "Waiting for data...");
          return;
      }

      console.log('[LuckyChallenge] Starting to load results for weekId:', weekId);
      console.log('[LuckyChallenge] Config:', { spreadsheetId, luckyDrawScriptUrl, luckyDrawSheetName });

      // Check if we're in the draw window (Sunday 8PM EST or later)
      // Use Intl.DateTimeFormat to get EST date components correctly
      const now = new Date();
      const estFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "long",
        hour: "numeric",
        hour12: false,
        day: "numeric"
      });
      
      // Get EST date parts
      const estParts = estFormatter.formatToParts(now);
      const estHour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
      const estWeekday = estParts.find(p => p.type === 'weekday')?.value || '';
      
      // Convert weekday to day number (0 = Sunday)
      const weekdayMap: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      const day = weekdayMap[estWeekday] ?? -1;
      const hour = estHour;
      const isInDrawWindow = (day === 0 && hour >= 20); // Sunday 8PM EST or later
      console.log('[LuckyChallenge] Time check - EST Weekday:', estWeekday, 'Day:', day, 'Hour:', hour, 'IsInDrawWindow:', isInDrawWindow);

      // Load current week result (priority: localStorage > Google Sheets)
      // Always try to load current week result, regardless of draw window
      // This ensures we show current week's result if it exists (even on Monday-Saturday)
      const loadCurrentWeekResult = async () => {
          console.log('[LuckyChallenge] loadCurrentWeekResult called for weekId:', weekId);
          // --- 1) 优先从 localStorage 读取已经抽出的结果，保证整周都固定 ---
          const stored = localStorage.getItem(`lucky_result_${weekId}`);
          if (stored) {
              try {
                  const parsed = JSON.parse(stored) as { winners?: string[]; task?: string };
                  if (Array.isArray(parsed.winners) && parsed.winners.length === 3 && typeof parsed.task === 'string') {
                      console.log('[LuckyChallenge] ✅ Found result in localStorage:', parsed);
                      setWinners(parsed.winners);
                      setAssignedTask(parsed.task);
                      return true; // Found in localStorage, no need to check Sheets
                  } else {
                      console.log('[LuckyChallenge] ⚠️ localStorage data format invalid:', parsed);
                  }
              } catch (error) {
                  console.warn('[LuckyChallenge] ⚠️ Failed to parse localStorage data:', error);
                  // ignore parse error and fall back to Google Sheets
              }
          } else {
              console.log('[LuckyChallenge] No data in localStorage for weekId:', weekId);
          }
          
          // --- 2) Try to load from Google Sheets (for current week) ---
          if (luckyDrawScriptUrl && spreadsheetId) {
              console.log('[LuckyChallenge] Attempting to load from API, URL:', `${luckyDrawScriptUrl}?weekId=${encodeURIComponent(weekId)}`);
              try {
                  // Try via API first
                  const url = `${luckyDrawScriptUrl}?weekId=${encodeURIComponent(weekId)}`;
                  const response = await fetch(url, { mode: 'cors' });
                  console.log('[LuckyChallenge] API response status:', response.status, 'ok:', response.ok);
                  if (response.ok) {
                      const result = await response.json();
                      console.log('[LuckyChallenge] API response data:', result);
                      if (result.success && result.data) {
                          setWinners(result.data.winners || []);
                          setAssignedTask(result.data.task || '');
                          // Also save to localStorage for consistency
                          localStorage.setItem(`lucky_result_${weekId}`, JSON.stringify(result.data));
                          console.log('[LuckyChallenge] ✅ Loaded current week result from API:', result.data);
                          return true;
                      } else {
                          console.log('[LuckyChallenge] ⚠️ API returned but success=false or no data:', result);
                      }
                  } else {
                      console.log('[LuckyChallenge] ⚠️ API response not ok, status:', response.status);
                  }
              } catch (error) {
                  console.warn('[LuckyChallenge] ⚠️ Failed to load current week result from API:', error);
                  // Fallback to CSV if available
              }
          } else {
              console.log('[LuckyChallenge] ⚠️ API config missing, luckyDrawScriptUrl:', luckyDrawScriptUrl, 'spreadsheetId:', spreadsheetId);
          }
          
          // --- 2b) Fallback: Try direct CSV fetch if API failed ---
          if (spreadsheetId && luckyDrawSheetName) {
              console.log('[LuckyChallenge] Attempting to load from CSV, sheet:', luckyDrawSheetName);
              try {
                  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(luckyDrawSheetName)}`;
                  console.log('[LuckyChallenge] CSV URL:', csvUrl);
                  const csvResponse = await fetch(csvUrl);
                  console.log('[LuckyChallenge] CSV response status:', csvResponse.status, 'ok:', csvResponse.ok);
                  if (csvResponse.ok) {
                      const csvText = await csvResponse.text();
                      console.log('[LuckyChallenge] CSV raw text (first 500 chars):', csvText.substring(0, 500));
                      const lines = csvText.split('\n').filter(line => line.trim());
                      console.log('[LuckyChallenge] CSV lines count:', lines.length);
                      if (lines.length > 1) {
                          const headers = lines[0].split(',');
                          console.log('[LuckyChallenge] CSV headers:', headers);
                          const weekIdIndex = headers.findIndex(h => /week|id/i.test(h));
                          console.log('[LuckyChallenge] WeekId column index:', weekIdIndex);
                          
                          if (weekIdIndex >= 0) {
                              // Find current week
                              // Support both formats: "W3" and "3"
                              const normalizedWeekId = weekId.replace(/^W/i, ''); // Normalize "W3" -> "3" for comparison
                              console.log('[LuckyChallenge] Searching for weekId:', weekId, 'or', normalizedWeekId, 'in CSV data...');
                              for (let i = 1; i < lines.length; i++) {
                                  const row = lines[i].split(',');
                                  const rowWeekId = row[weekIdIndex]?.trim().replace(/"/g, ''); // Remove quotes if present
                                  console.log('[LuckyChallenge] Row', i, 'WeekId value:', rowWeekId);
                                  // Match both "W3" format and "3" format
                                  if (rowWeekId && (
                                      rowWeekId === weekId || 
                                      rowWeekId === normalizedWeekId ||
                                      rowWeekId.replace(/^W/i, '') === normalizedWeekId
                                  )) {
                                      // Found current week's result
                                      // Remove quotes from CSV values
                                      const result = {
                                          weekId: rowWeekId,
                                          winners: [
                                              row[1]?.trim().replace(/"/g, '') || '',
                                              row[2]?.trim().replace(/"/g, '') || '',
                                              row[3]?.trim().replace(/"/g, '') || ''
                                          ],
                                          task: row[4]?.trim().replace(/"/g, '') || ''
                                      };
                                      setWinners(result.winners);
                                      setAssignedTask(result.task);
                                      // Save to localStorage for consistency
                                      localStorage.setItem(`lucky_result_${weekId}`, JSON.stringify(result));
                                      console.log('[LuckyChallenge] ✅ Loaded current week result from CSV:', result);
                                      return true;
                                  }
                              }
                              console.log('[LuckyChallenge] ⚠️ WeekId', weekId, 'not found in CSV data');
                          } else {
                              console.log('[LuckyChallenge] ⚠️ WeekId column not found in CSV headers');
                          }
                      } else {
                          console.log('[LuckyChallenge] ⚠️ CSV has no data rows (only headers or empty)');
                      }
                  } else {
                      console.log('[LuckyChallenge] ⚠️ CSV response not ok, status:', csvResponse.status);
                  }
              } catch (csvError) {
                  console.warn('[LuckyChallenge] ⚠️ Failed to load current week result from CSV:', csvError);
              }
          } else {
              console.log('[LuckyChallenge] ⚠️ CSV config missing, spreadsheetId:', spreadsheetId, 'luckyDrawSheetName:', luckyDrawSheetName);
          }
          
          return false; // No current week result found
      };
      
      // Load results: Always try current week first, then fallback to previous week
      // This ensures:
      // - Monday-Saturday: Show current week result if it exists (already drawn), otherwise show previous week
      // - Sunday 8PM+: In draw window, try to load current week, if not found show previous week
      loadCurrentWeekResult().then(hasCurrentWeekResult => {
          console.log('[LuckyChallenge] loadCurrentWeekResult finished, hasResult:', hasCurrentWeekResult);
          if (!hasCurrentWeekResult) {
              console.log('[LuckyChallenge] No current week result, trying to load previous week...');
              // If no current week result, show previous week's result as fallback
              loadPreviousDrawResults(weekId).then(prevResult => {
                  console.log('[LuckyChallenge] loadPreviousDrawResults result:', prevResult);
                  if (prevResult && prevResult.winners && prevResult.winners.length === 3) {
                      console.log('[LuckyChallenge] ✅ Loaded previous week result as fallback:', prevResult);
                      setWinners(prevResult.winners);
                      setAssignedTask(prevResult.task || '');
                  } else {
                      console.log('[LuckyChallenge] ⚠️ No previous week result found or invalid format');
                  }
              }).catch(error => {
                  console.error('[LuckyChallenge] ❌ Error loading previous week result:', error);
              });
          } else {
              console.log('[LuckyChallenge] ✅ Current week result loaded and displayed');
          }
      }).catch(error => {
          console.error('[LuckyChallenge] ❌ Error in loadCurrentWeekResult:', error);
          // On error, still try to load previous week as fallback
          loadPreviousDrawResults(weekId).then(prevResult => {
              if (prevResult && prevResult.winners && prevResult.winners.length === 3) {
                  console.log('[LuckyChallenge] ✅ Loaded previous week result after error:', prevResult);
                  setWinners(prevResult.winners);
                  setAssignedTask(prevResult.task || '');
              }
          }).catch(prevError => {
              console.error('[LuckyChallenge] ❌ Error loading previous week result after error:', prevError);
          });
      });

      // 2) Check EST Time (只控制是否可以"抽奖按钮"，不影响结果显示)
      const checkTime = () => {
          // Use Intl.DateTimeFormat to get EST date components correctly
          const now = new Date();
          const estFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/New_York",
            weekday: "long",
            hour: "numeric",
            hour12: false,
            minute: "numeric"
          });
          
          // Get EST date parts
          const estParts = estFormatter.formatToParts(now);
          const estHour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
          const estMinute = parseInt(estParts.find(p => p.type === 'minute')?.value || '0', 10);
          const estWeekday = estParts.find(p => p.type === 'weekday')?.value || '';
          
          // Convert weekday to day number (0 = Sunday)
          const weekdayMap: { [key: string]: number } = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
          };
          const day = weekdayMap[estWeekday] ?? -1;
          const hour = estHour;
          
          // --- RULES ---
          // 2. Official Window: Sunday 8 PM EST to Monday 12 AM EST (Sunday 20:00 - 23:59)
          const isOfficialWindow = (day === 0 && hour >= 20);

          const isOpen = isOfficialWindow;

          // Detailed logging for debugging
          console.log('[LuckyChallenge] checkTime - EST:', {
            weekday: estWeekday,
            day,
            hour,
            minute: estMinute,
            isOfficialWindow,
            isOpen,
            weekId,
            now: now.toISOString()
          });

          if (isOpen) {
              setIsUnlocked(true);
              setStatusMessage("Ready to Draw");
              console.log('[LuckyChallenge] ✅ Button UNLOCKED - Ready to draw');
          } else {
              setIsUnlocked(false);
              setStatusMessage("Draw Opens: Sunday 8PM EST, Close: Monday 12AM EST");
              console.log('[LuckyChallenge] 🔒 Button LOCKED - Not in draw window');
          }
      };

      checkTime();
      const timer = setInterval(checkTime, 60000); // Check every minute

      // 3) 兼容旧数据：如果之前只存了 seen_draw 标记，但没有存具体 winners，则用确定性算法补一次并落库
      const hasSeen = localStorage.getItem(`seen_draw_${weekId}`);
      const storedResult = localStorage.getItem(`lucky_result_${weekId}`);
      const hasStoredResult = !!storedResult;
      if (hasSeen && !hasStoredResult && winners.length === 0) {
          const result = performDeterministicDraw();
          if (result) {
              setWinners(result.winners);
              setAssignedTask(result.task);
              localStorage.setItem(
                  `lucky_result_${weekId}`,
                  JSON.stringify({ winners: result.winners, task: result.task })
              );
              // Also save to Google Sheets
              saveDrawResultToSheet(weekId, result.winners, result.task);
          }
      }

      return () => clearInterval(timer);
  }, [weekId, currentWeekRunners, isPoolLoading, challengePool, usedTasks, spreadsheetId, luckyDrawScriptUrl]); // Add dependencies

  const handleDraw = () => {
    if (isDrawing || !isUnlocked) return;
    
    const result = performDeterministicDraw();
    if (!result) {
        alert("Not enough runners active this week to draw, or challenge pool failed to load.");
        return;
    }

    setIsDrawing(true);
    
    // Animation Sequence - Extended duration for better suspense
    let shuffleCount = 0;
    const maxShuffles = 30; // Increased from 15 to 30 for longer animation (3 seconds total)
    
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
            // Persist concrete winners & task so该周内任何时间刷新都保持一致
            localStorage.setItem(
                `lucky_result_${weekId}`,
                JSON.stringify({ winners: result.winners, task: result.task })
            );
            // Save to Google Sheets
            saveDrawResultToSheet(weekId, result.winners, result.task);
            // Update used tasks list
            setUsedTasks(prev => [...prev, result.task]);
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
            <p className="text-center text-slate-400 text-sm mb-6">🎲 天选之子</p>

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
                {/* Always show result if available */}
                {hasResult && (
                    <div className="animate-fadeIn mb-4">
                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                            <p className="text-amber-300 text-xs uppercase tracking-wider font-bold mb-1">Challenge Mission</p>
                            <p className="text-lg font-bold text-white">{assignedTask}</p>
                        </div>
                    </div>
                )}
                
                {/* Show button if unlocked (even if there's a result - allows re-draw in new week) */}
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
                    {isUnlocked && !isPoolLoading && (
                        <p className="text-xs text-slate-500">
                            {hasResult ? "Draw is open! Click to draw for this week (will update result)." : "Draw is open! Results are final for the week."}
                        </p>
                    )}
                 </div>
            </div>

            {/* Footer Upload Action (Always visible) */}
            <div className="mt-8 pt-4 border-t border-slate-700/50">
               <button 
                  onClick={onUploadClick}
                  className="w-full bg-slate-900/50 hover:bg-slate-700/80 border border-slate-600 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all group"
               >
                  <Camera size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
                    📢 请天选之子们上传视频！
                  </span>
               </button>
            </div>
        </div>
    </section>
  );
};
