import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, User, Lock, Clock, Camera, Loader2 } from 'lucide-react';

// START_DATE: W1 Start Date (Dec 15, 2025, Monday)
const START_DATE = new Date('2025-12-15T00:00:00');

// Helper: Calculate current week ID based on current date
// This ensures we use the correct weekId even if the sheet doesn't exist yet
const getCurrentWeekId = (): string => {
  const now = new Date();
  const estFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  
  // Get EST date
  const estParts = estFormatter.formatToParts(now);
  const year = parseInt(estParts.find(p => p.type === 'year')?.value || '2025', 10);
  const month = parseInt(estParts.find(p => p.type === 'month')?.value || '12', 10);
  const day = parseInt(estParts.find(p => p.type === 'day')?.value || '15', 10);
  
  const estDate = new Date(year, month - 1, day);
  
  // Calculate days since START_DATE
  const daysDiff = Math.floor((estDate.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate week number (0-based from W1)
  // Each week starts on Monday
  const weekNum = Math.floor(daysDiff / 7) + 1;
  
  return `W${weekNum}`;
};

// Configuration: Specify which week needs makeup draw (e.g., "W5")
// To enable makeup for a different week, simply change this value to the target week ID
// Makeup window: Monday 8PM-11:59PM EST only (expires after Monday midnight)
const MAKEUP_WEEK_ID = "W5"; // Change this to enable makeup for other weeks (e.g., "W6", "W7")

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
  const [hasDrawnThisWeek, setHasDrawnThisWeek] = useState(false); // Track if draw has been completed for current week
  const [isMakeupWindow, setIsMakeupWindow] = useState(false); // Track if currently in makeup window
  const [makeupWeekId, setMakeupWeekId] = useState<string | null>(null); // Track which week needs makeup draw (e.g., "W5")
  const [hasPreviousWeekResult, setHasPreviousWeekResult] = useState<boolean>(false); // Track if previous week has result
  
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
  
  // Helper: Parse CSV row properly handling quoted fields with commas
  const parseCSVRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  };

  // Helper: Load all used tasks from Google Sheets
  const loadUsedTasks = async () => {
    if (!spreadsheetId || !luckyDrawSheetName) {
      console.log('[LuckyChallenge] loadUsedTasks: Missing config');
      return [];
    }
    
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(luckyDrawSheetName)}`;
      console.log('[LuckyChallenge] Loading used tasks from:', csvUrl);
      const csvResponse = await fetch(csvUrl);
      if (csvResponse.ok) {
        const csvText = await csvResponse.text();
        console.log('[LuckyChallenge] CSV text (first 500 chars):', csvText.substring(0, 500));
        const lines = csvText.split('\n').filter(line => line.trim());
        console.log('[LuckyChallenge] CSV lines count:', lines.length);
        
        if (lines.length > 1) {
          // Parse header row properly
          const headers = parseCSVRow(lines[0]);
          console.log('[LuckyChallenge] CSV headers:', headers);
          const taskIndex = headers.findIndex(h => /task|项目|challenge/i.test(h));
          console.log('[LuckyChallenge] Task column index:', taskIndex);
          
          if (taskIndex >= 0) {
            const used: string[] = [];
            for (let i = 1; i < lines.length; i++) {
              const row = parseCSVRow(lines[i]);
              if (row.length > taskIndex) {
                // Remove quotes and trim
                const task = row[taskIndex]?.replace(/^"|"$/g, '').trim();
                if (task && task.length > 0) {
                  // Normalize: remove extra spaces and ensure consistent format
                  const normalizedTask = task.replace(/\s+/g, ' ').trim();
                  if (!used.includes(normalizedTask)) {
                    used.push(normalizedTask);
                    console.log('[LuckyChallenge] Found used task:', normalizedTask);
                  } else {
                    console.log('[LuckyChallenge] Duplicate task skipped:', normalizedTask);
                  }
                }
              }
            }
            console.log('[LuckyChallenge] ✅ Loaded used tasks:', used);
            return used;
          } else {
            console.warn('[LuckyChallenge] ⚠️ Task column not found in headers');
          }
        }
      } else {
        console.warn('[LuckyChallenge] ⚠️ CSV response not ok:', csvResponse.status);
      }
    } catch (error) {
      console.error('[LuckyChallenge] ❌ Failed to load used tasks:', error);
    }
    
    console.log('[LuckyChallenge] ⚠️ Returning empty used tasks list');
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

  // Randomly pick winners and task (truly random, not deterministic)
  // Each call will produce different results until saved
  const performRandomDraw = () => {
    if (!currentWeekRunners || currentWeekRunners.length < 3) return null;
    if (challengePool.length === 0) return null;

    console.log('[LuckyChallenge] performRandomDraw - usedTasks:', usedTasks);
    console.log('[LuckyChallenge] performRandomDraw - challengePool length:', challengePool.length);

    // 1. Filter out used tasks (normalize both for comparison)
    const availableTasks = challengePool.filter(task => {
      const normalizedTask = task.replace(/\s+/g, ' ').trim();
      const isUsed = usedTasks.some(used => {
        const normalizedUsed = used.replace(/\s+/g, ' ').trim();
        return normalizedTask === normalizedUsed;
      });
      if (isUsed) {
        console.log('[LuckyChallenge] Filtering out used task:', normalizedTask);
      }
      return !isUsed;
    });
    
    console.log('[LuckyChallenge] Available tasks after filtering:', availableTasks.length, 'out of', challengePool.length);
    
    // If all tasks are used, use all tasks as fallback (could happen if pool is smaller than weeks)
    if (availableTasks.length === 0) {
      console.warn('[LuckyChallenge] ⚠️ All challenges have been used, will use all tasks from pool');
    }

    // 2. Sort runners to ensure consistent order
    const sortedRunners = [...currentWeekRunners].sort();
    
    // 3. Use truly random selection (not deterministic)
    // Each time this function is called, it will produce different results
    const resultWinners: string[] = [];
    const usedIndices = new Set<number>();
    
    // 4. Pick 3 distinct winners using Math.random()
    while(resultWinners.length < 3) {
        const idx = Math.floor(Math.random() * sortedRunners.length);
        
        if (!usedIndices.has(idx)) {
            usedIndices.add(idx);
            resultWinners.push(sortedRunners[idx]);
        }
    }

    // 5. Pick 1 Task from available tasks (excluding used ones)
    const tasksToUse = availableTasks.length > 0 ? availableTasks : challengePool;
    const taskIdx = Math.floor(Math.random() * tasksToUse.length);
    
    console.log('[LuckyChallenge] Random draw performed - winners:', resultWinners, 'task:', tasksToUse[taskIdx]);
    
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

      console.log('[LuckyChallenge] ===== Starting to load results =====');
      console.log('[LuckyChallenge] Current weekId:', weekId);
      console.log('[LuckyChallenge] Current week runners:', currentWeekRunners);
      console.log('[LuckyChallenge] Config:', { spreadsheetId, luckyDrawScriptUrl, luckyDrawSheetName });
      
      // Reset hasDrawnThisWeek when weekId changes (new week)
      setHasDrawnThisWeek(false);

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
      
      // Calculate the correct weekId based on current date (not sheet existence)
      // This ensures we use W4 even if the W4 sheet doesn't exist yet
      const currentDateWeekId = getCurrentWeekId();
      console.log('[LuckyChallenge] Time check - EST Weekday:', estWeekday, 'Day:', day, 'Hour:', hour, 'IsInDrawWindow:', isInDrawWindow);
      console.log('[LuckyChallenge] WeekId from props (sheet-based):', weekId);
      console.log('[LuckyChallenge] WeekId from date (current week):', currentDateWeekId);
      
      // Use the date-based weekId if we're in the draw window (for new week draws)
      // Otherwise use the prop weekId (for displaying existing results)
      const effectiveWeekId = isInDrawWindow ? currentDateWeekId : weekId;
      console.log('[LuckyChallenge] Effective weekId to use:', effectiveWeekId);

      // Load current week result (priority: Google Sheets > localStorage)
      // Always try to load current week result, regardless of draw window
      // This ensures we show current week's result if it exists (even on Monday-Saturday)
      // Priority changed: Google Sheets first (source of truth), then localStorage (cache)
      const loadCurrentWeekResult = async (targetWeekId: string) => {
          console.log('[LuckyChallenge] loadCurrentWeekResult called for weekId:', targetWeekId);
          
          // --- 1) First try to load from Google Sheets (source of truth) ---
          // This ensures that if data is deleted from Excel, it won't show cached localStorage data
          
          // --- 2) Fallback to localStorage if Google Sheets doesn't have the data ---
          // This is a cache, but only used if Google Sheets doesn't have the data
          const stored = localStorage.getItem(`lucky_result_${targetWeekId}`);
          if (stored) {
              try {
                  const parsed = JSON.parse(stored) as { winners?: string[]; task?: string };
                  if (Array.isArray(parsed.winners) && parsed.winners.length === 3 && typeof parsed.task === 'string') {
                      console.log('[LuckyChallenge] ✅ Found result in localStorage (cache):', parsed);
                      setWinners(parsed.winners);
                      setAssignedTask(parsed.task);
                      setHasDrawnThisWeek(true); // Mark as drawn
                      return true; // Found in localStorage cache
                  } else {
                      console.log('[LuckyChallenge] ⚠️ localStorage data format invalid:', parsed);
                  }
              } catch (error) {
                  console.warn('[LuckyChallenge] ⚠️ Failed to parse localStorage data:', error);
              }
          } else {
              console.log('[LuckyChallenge] No data in localStorage for weekId:', targetWeekId);
          }
          
          // --- 3) Try to load from Google Sheets (for current week) ---
          if (luckyDrawScriptUrl && spreadsheetId) {
              console.log('[LuckyChallenge] Attempting to load from API, URL:', `${luckyDrawScriptUrl}?weekId=${encodeURIComponent(targetWeekId)}`);
              try {
                  // Try via API first
                  const url = `${luckyDrawScriptUrl}?weekId=${encodeURIComponent(targetWeekId)}`;
                  const response = await fetch(url, { mode: 'cors' });
                  console.log('[LuckyChallenge] API response status:', response.status, 'ok:', response.ok);
                  if (response.ok) {
                      const result = await response.json();
                      console.log('[LuckyChallenge] API response data:', result);
                      if (result.success && result.data) {
                          setWinners(result.data.winners || []);
                          setAssignedTask(result.data.task || '');
                          setHasDrawnThisWeek(true); // Mark as drawn
                          // Also save to localStorage for consistency
                          localStorage.setItem(`lucky_result_${targetWeekId}`, JSON.stringify(result.data));
                          console.log('[LuckyChallenge] ✅ Loaded current week result from API:', result.data);
                          return true;
                      } else {
                          // If API returns no data, clear localStorage cache for this week
                          console.log('[LuckyChallenge] ⚠️ API returned no data for weekId:', targetWeekId, '- clearing localStorage cache');
                          localStorage.removeItem(`lucky_result_${targetWeekId}`);
                          localStorage.removeItem(`seen_draw_${targetWeekId}`);
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
                              const normalizedWeekId = targetWeekId.replace(/^W/i, ''); // Normalize "W3" -> "3" for comparison
                              console.log('[LuckyChallenge] Searching for weekId:', targetWeekId, 'or', normalizedWeekId, 'in CSV data...');
                              for (let i = 1; i < lines.length; i++) {
                                  const row = lines[i].split(',');
                                  const rowWeekId = row[weekIdIndex]?.trim().replace(/"/g, ''); // Remove quotes if present
                                  console.log('[LuckyChallenge] Row', i, 'WeekId value:', rowWeekId);
                                  // Match both "W3" format and "3" format
                                  if (rowWeekId && (
                                      rowWeekId === targetWeekId || 
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
                                      setHasDrawnThisWeek(true); // Mark as drawn
                                      // Save to localStorage as cache
                                      localStorage.setItem(`lucky_result_${targetWeekId}`, JSON.stringify(result));
                                      console.log('[LuckyChallenge] ✅ Loaded current week result from CSV:', result);
                                      return true;
                                  }
                              }
                              // If we reach here, the weekId was not found in CSV
                              // Clear localStorage cache for this week
                              console.log('[LuckyChallenge] ⚠️ WeekId', targetWeekId, 'not found in CSV - clearing localStorage cache');
                              localStorage.removeItem(`lucky_result_${targetWeekId}`);
                              localStorage.removeItem(`seen_draw_${targetWeekId}`);
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
      // - Sunday 8PM+: In draw window, try to load current week (based on date), if not found show previous week
      loadCurrentWeekResult(effectiveWeekId).then(hasCurrentWeekResult => {
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
                      setHasDrawnThisWeek(false); // Previous week's result, current week not drawn yet
                      setHasPreviousWeekResult(true); // Previous week has result
                      setMakeupWeekId(null); // No makeup needed
                  } else {
                      console.log('[LuckyChallenge] ⚠️ No previous week result found or invalid format');
                      setHasDrawnThisWeek(false); // No result found, not drawn yet
                      // Check if we need to set up makeup draw for previous week
                      const weekMatch = weekId.match(/^W(\d+)$/i);
                      if (weekMatch) {
                          const currentWeekNum = parseInt(weekMatch[1]);
                          if (currentWeekNum > 1) {
                              const prevWeekId = `W${currentWeekNum - 1}`;
                              setHasPreviousWeekResult(false); // Previous week has no result
                              setMakeupWeekId(prevWeekId); // Set makeup weekId for potential makeup draw
                              console.log('[LuckyChallenge] ⚠️ Previous week', prevWeekId, 'has no result - makeup draw available on Monday 8PM-11:59PM EST');
                          }
                      }
                  }
              }).catch(error => {
                  console.error('[LuckyChallenge] ❌ Error loading previous week result:', error);
              });
          } else {
              console.log('[LuckyChallenge] ✅ Current week result loaded and displayed');
              // Current week has result, check previous week for makeup
              const weekMatch = weekId.match(/^W(\d+)$/i);
              if (weekMatch) {
                  const currentWeekNum = parseInt(weekMatch[1]);
                  if (currentWeekNum > 1) {
                      const prevWeekId = `W${currentWeekNum - 1}`;
                      // Check if previous week has result
                      loadPreviousDrawResults(weekId).then(prevResult => {
                          if (prevResult && prevResult.winners && prevResult.winners.length === 3) {
                              setHasPreviousWeekResult(true);
                              setMakeupWeekId(null);
                          } else {
                              setHasPreviousWeekResult(false);
                              setMakeupWeekId(prevWeekId);
                              console.log('[LuckyChallenge] ⚠️ Previous week', prevWeekId, 'has no result - makeup draw available on Monday 8PM-11:59PM EST');
                          }
                      }).catch(() => {
                          // On error, assume previous week might need makeup
                          setHasPreviousWeekResult(false);
                          setMakeupWeekId(prevWeekId);
                      });
                  }
              }
          }
      }).catch(error => {
          console.error('[LuckyChallenge] ❌ Error in loadCurrentWeekResult:', error);
          // On error, still try to load previous week as fallback
          loadPreviousDrawResults(weekId).then(prevResult => {
              if (prevResult && prevResult.winners && prevResult.winners.length === 3) {
                  console.log('[LuckyChallenge] ✅ Loaded previous week result after error:', prevResult);
                  setWinners(prevResult.winners);
                  setAssignedTask(prevResult.task || '');
                  setHasDrawnThisWeek(false); // Previous week's result, current week not drawn yet
                  setHasPreviousWeekResult(true);
                  setMakeupWeekId(null);
              } else {
                  setHasDrawnThisWeek(false); // No result found, not drawn yet
                  const weekMatch = weekId.match(/^W(\d+)$/i);
                  if (weekMatch) {
                      const currentWeekNum = parseInt(weekMatch[1]);
                      if (currentWeekNum > 1) {
                          const prevWeekId = `W${currentWeekNum - 1}`;
                          setHasPreviousWeekResult(false);
                          setMakeupWeekId(prevWeekId);
                      }
                  }
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
          // 1. Official Window: Sunday 8 PM EST or later
          const isOfficialWindow = (day === 0 && hour >= 20);
          
          // 2. Makeup Window: Monday 8 PM EST to 11:59 PM EST (补救窗口)
          //    Only available if:
          //    - Current time is Monday 8PM-11:59PM EST (expires after Monday midnight)
          //    - Previous week matches MAKEUP_WEEK_ID and has no draw result
          //    Monday: hour >= 20 && hour < 24 (8PM - 11:59PM, expires at midnight)
          const isMakeupWindowActive = (day === 1 && hour >= 20 && hour < 24);
          setIsMakeupWindow(isMakeupWindowActive);

          // Check if makeup draw is available (only on Monday 8PM-11:59PM EST)
          // Must match MAKEUP_WEEK_ID and previous week must have no result
          if (isMakeupWindowActive && makeupWeekId === MAKEUP_WEEK_ID && !hasPreviousWeekResult) {
              // Makeup draw available for the specified week
              setIsUnlocked(true);
              setStatusMessage(`Makeup Draw Window: Draw for ${makeupWeekId} (Monday 8PM-11:59PM EST only)`);
              console.log('[LuckyChallenge] ✅ Button UNLOCKED - Makeup window for', makeupWeekId, '(expires at Monday midnight)');
              return; // Early return, don't check normal window
          } else if (isMakeupWindowActive && makeupWeekId === MAKEUP_WEEK_ID && hasPreviousWeekResult) {
              // Makeup week already has result, window closed
              setIsUnlocked(false);
              setStatusMessage(`${makeupWeekId} already has draw result. Makeup window closed.`);
              console.log('[LuckyChallenge] 🔒 Button LOCKED - Makeup week already has result');
              return;
          } else if (isMakeupWindowActive && makeupWeekId !== MAKEUP_WEEK_ID) {
              // Not the configured makeup week, window closed
              setIsUnlocked(false);
              setStatusMessage(`Makeup window not available for ${makeupWeekId || 'this week'}.`);
              console.log('[LuckyChallenge] 🔒 Button LOCKED - Not the configured makeup week');
              return;
          }

          // Normal draw window: Sunday 8PM+ AND not already drawn this week
          const isOpen = isOfficialWindow && !hasDrawnThisWeek;

          // Detailed logging for debugging
          console.log('[LuckyChallenge] ===== Time Check =====');
          console.log('[LuckyChallenge] Current weekId:', weekId);
          console.log('[LuckyChallenge] EST Time:', {
            weekday: estWeekday,
            day,
            hour,
            minute: estMinute,
            fullTime: `${estWeekday} ${hour}:${estMinute.toString().padStart(2, '0')}`,
            isOfficialWindow,
            isMakeupWindowActive,
            hasDrawnThisWeek,
            hasPreviousWeekResult,
            makeupWeekId,
            isOpen,
            now: now.toISOString()
          });
          console.log('[LuckyChallenge] Button state will be:', isOpen ? 'UNLOCKED' : 'LOCKED');

          if (isOpen) {
              setIsUnlocked(true);
              setStatusMessage("Ready to Draw");
              console.log('[LuckyChallenge] ✅ Button UNLOCKED - Ready to draw');
          } else {
              setIsUnlocked(false);
              if (hasDrawnThisWeek) {
                  setStatusMessage("Draw completed for this week. Next draw opens Sunday 8PM EST.");
                  console.log('[LuckyChallenge] 🔒 Button LOCKED - Already drawn this week');
              } else {
                  setStatusMessage("Draw Opens: Sunday 8PM EST.");
                  console.log('[LuckyChallenge] 🔒 Button LOCKED - Not in draw window');
              }
          }
      };

      checkTime();
      const timer = setInterval(checkTime, 60000); // Check every minute
      
      // 3) 兼容旧数据：如果之前只存了 seen_draw 标记，但没有存具体 winners，则用随机算法补一次并落库
      const hasSeen = localStorage.getItem(`seen_draw_${effectiveWeekId}`);
      const storedResult = localStorage.getItem(`lucky_result_${effectiveWeekId}`);
      const hasStoredResult = !!storedResult;
      if (hasSeen && !hasStoredResult && winners.length === 0) {
          const result = performRandomDraw();
          if (result) {
            setWinners(result.winners);
            setAssignedTask(result.task);
              setHasDrawnThisWeek(true);
              localStorage.setItem(
                  `lucky_result_${effectiveWeekId}`,
                  JSON.stringify({ winners: result.winners, task: result.task })
              );
              // Also save to Google Sheets
              saveDrawResultToSheet(effectiveWeekId, result.winners, result.task);
          }
      }

      return () => clearInterval(timer);
  }, [weekId, currentWeekRunners, isPoolLoading, challengePool, usedTasks, spreadsheetId, luckyDrawScriptUrl, hasDrawnThisWeek, isMakeupWindow, makeupWeekId, hasPreviousWeekResult]); // Add dependencies

  const handleDraw = () => {
    // Allow draw if:
    // 1. Not currently drawing
    // 2. Unlocked (time window is open)
    // 3. Either not drawn this week OR in makeup window (allows makeup draw for previous week)
    if (isDrawing || !isUnlocked) return;
    
    // If in makeup window, only allow if:
    // 1. Previous week matches MAKEUP_WEEK_ID
    // 2. Previous week has no result
    if (hasDrawnThisWeek && !isMakeupWindow) return;
    if (hasDrawnThisWeek && isMakeupWindow && (makeupWeekId !== MAKEUP_WEEK_ID || hasPreviousWeekResult)) return;
    
    // Perform truly random draw (different each time)
    const result = performRandomDraw();
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
          // Calculate the correct weekId based on current date for new draws
          // Get current EST time to determine if we're in draw window
          const now = new Date();
          const estFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/New_York",
            weekday: "long",
            hour: "numeric",
            hour12: false
          });
          const estParts = estFormatter.formatToParts(now);
          const drawHour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
          const drawWeekday = estParts.find(p => p.type === 'weekday')?.value || '';
          const weekdayMap: { [key: string]: number } = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
          };
          // Determine which weekId to use for saving
          // If in makeup window and makeupWeekId is set, use makeupWeekId (previous week)
          // Otherwise, use normal logic (current week)
          let drawWeekId: string;
          if (isMakeupWindow && makeupWeekId) {
              // Makeup draw: save to previous week's weekId
              drawWeekId = makeupWeekId;
              console.log('[LuckyChallenge] Makeup draw completed - saving to', drawWeekId);
          } else {
              // Normal draw: use current week logic
              const drawDay = weekdayMap[drawWeekday] ?? -1;
              const isInDrawWindow = (drawDay === 0 && drawHour >= 20);
              const currentDateWeekId = getCurrentWeekId();
              drawWeekId = isInDrawWindow ? currentDateWeekId : weekId;
              console.log('[LuckyChallenge] Normal draw completed - using weekId:', drawWeekId, '(from date:', currentDateWeekId, 'from props:', weekId, ')');
              // Mark as drawn for this week - button will be disabled
              setHasDrawnThisWeek(true);
          }
          
          // Save state so we don't animate again
          localStorage.setItem(`seen_draw_${drawWeekId}`, "true");
          // Persist concrete winners & task so该周内任何时间刷新都保持一致
          localStorage.setItem(
              `lucky_result_${drawWeekId}`,
              JSON.stringify({ winners: result.winners, task: result.task })
          );
          // Save to Google Sheets
          saveDrawResultToSheet(drawWeekId, result.winners, result.task);
          // Update used tasks list
          setUsedTasks(prev => [...prev, result.task]);
          
          // If this was a makeup draw, mark previous week as having result now
          if (isMakeupWindow && makeupWeekId === MAKEUP_WEEK_ID) {
              setHasPreviousWeekResult(true);
              setMakeupWeekId(null); // Clear makeup weekId after successful draw
              console.log('[LuckyChallenge] Makeup draw completed for', drawWeekId, '- makeup window closed');
          }
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
                
                {/* Show button if unlocked and (not already drawn OR in makeup window for configured week) */}
                {!isUnlocked || isPoolLoading || (hasDrawnThisWeek && !(isMakeupWindow && makeupWeekId === MAKEUP_WEEK_ID && !hasPreviousWeekResult)) ? (
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed">
                        {isPoolLoading ? <Loader2 size={18} className="animate-spin" /> : hasDrawnThisWeek ? <Lock size={18} /> : <Clock size={18} />}
                        <span>{hasDrawnThisWeek ? "Draw completed for this week. Next draw opens Sunday 8PM EST." : statusMessage}</span>
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
                                {isDrawing ? "Drawing..." : (isMakeupWindow && makeupWeekId ? `✨ 补救抽取 ${makeupWeekId} ✨` : "✨ 抽取幸运跑友 ✨")}
                            </button>
                        )}
                         
                         {/* Info Text */}
                         <div className="mt-4 flex flex-col items-center gap-1">
                            {!isUnlocked && !isPoolLoading && (
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Lock size={12} /> Results are locked until Sunday 8 PM EST.
                                </p>
                            )}
                    {isUnlocked && !isPoolLoading && !hasDrawnThisWeek && (
                                <p className="text-xs text-slate-500">
                            Draw is open! Click to draw for this week.
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
