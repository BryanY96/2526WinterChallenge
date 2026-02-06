import React, { useEffect, useState } from 'react';
import { HeroSection } from './components/HeroSection';
import { MapSection } from './components/MapSection';
import { StatsSection } from './components/StatsSection';
import { LuckyChallenge } from './components/LuckyChallenge';
import { Leaderboard, Period } from './components/Leaderboard';
import { GallerySection, GalleryItem } from './components/GallerySection';
import { UploadModal } from './components/UploadModal';
import { BackgroundEffects } from './components/BackgroundEffects';
import { Snowflake, RefreshCw, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

// CONFIGURATION
const SPREADSHEET_ID = '1kLWZSg1MfTdUf8nc38n5HYv4N-xh4Nz__N-96_dSLtk'; 
export const CLOUD_NAME = 'dieibdhtx';
export const UPLOAD_PRESET = 'ChallengeVideos'; 
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzoF4WKL_tT3uy1V6XIn7xObs7-cxCmsw5IJFZe0_R0-LFqCkpTnCyTK95nSneEtMTk/exec';
// Lucky Draw Results Sheet Configuration
export const LUCKY_DRAW_SHEET_NAME = 'Lucky Results'; // Sheet name for storing draw results
export const LUCKY_DRAW_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwjupWMYmuukHmYsq0ANHEChWTsyi0xY_NB4ULZSvfZFCe39rug7t0LBYAWIOVaMoW7/exec'; // Can use same script or different one
// Supply Station Team: We store the partner name directly in the weekly sheet in a "补给站搭档" or "Supply Station Partner" column

// Updated Goal: 10,000km to Mohe (Arctic City)
const GOAL_KM = 10000;
// Supply Station (Anchorage) distance - based on actual route position (~5000km)
const SUPPLY_STATION_KM = 5000;
// W1 Start Date: Dec 15, 2025 (As requested)
const START_DATE = new Date('2025-12-15T00:00:00'); 

export interface RunnerData {
  name: string;
  distance: number;
  rawDistance?: number;
  bonusDistance?: number;
  streakCount?: number;
  hasStreak?: boolean; 
  isPerfect?: boolean; 
  // Daily records: key is day column name (e.g., "Mon", "Tue", "周一"), value is distance in km
  dailyRecords?: Record<string, number>;
  // Week ID for this data (e.g., "W1", "W2")
  weekId?: string;
  // Supply Station Team: if this runner is part of the team that reached the supply station (5400km)
  isSupplyStationTeam?: boolean;
  // Supply Station Partner: name of the partner runner
  supplyStationPartner?: string;
}

// Helper: Generate display label for a week key (e.g., "W1" -> "W1 (12/15-12/21)")
const getWeekLabel = (key: string) => {
    const match = key.match(/^W(\d+)$/i);
    if (!match) return key; 
    
    const weekNum = parseInt(match[1]);
    const start = new Date(START_DATE);
    start.setDate(START_DATE.getDate() + (weekNum - 1) * 7);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${key} (${fmt(start)}-${fmt(end)})`;
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [distanceThisWeek, setDistanceThisWeek] = useState(0);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activeRunnersThisWeek, setActiveRunnersThisWeek] = useState(0);
  
  // Lucky Challenge State
  const [currentWeekRunners, setCurrentWeekRunners] = useState<string[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState<string>("");

  // Upload & Gallery State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  // Parse a single CSV string
  const parseCSV = (csvText: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => resolve(results.data),
        error: (err: any) => reject(err)
      });
    });
  };

  // Improved row analysis logic
  const analyzeRow = (row: any): { distance: number, frequency: number, dailyRecords: Record<string, number> } => {
      const keys = Object.keys(row);
      
      // 1. Identify the primary Total column
      const totalKey = keys.find(k => 
        /total|distance|km|mile|总里程|累计/i.test(k) && 
        !/name|队员|姓名|user|id/i.test(k)
      );

      // 2. Define what counts as a "Daily Log" column
      const isDailyColumn = (k: string) => {
          // Matches Chinese days (周一...周日), English days (Mon...Sun), or Date format (12/15)
          const dayPattern = /周[一二三四五六日]|mon|tue|wed|thu|fri|sat|sun/i;
          const datePattern = /^\d{1,2}[\/\-]\d{1,2}/; 
          return dayPattern.test(k) || datePattern.test(k);
      };

      let distance = 0;
      let frequency = 0;
      let calcSum = 0;
      const dailyRecords: Record<string, number> = {};

      if (totalKey) {
          distance = parseFloat(row[totalKey]) || 0;
      }
    
      keys.forEach(k => {
          // Exclude identified non-distance columns
          if (/队员|name|姓名|姓名|id|timestamp|date|time|url|link|video|image|备注|notes/i.test(k)) return;
          if (totalKey && k === totalKey) return; 

          const val = parseFloat(row[k]);
          if (!isNaN(val) && isDailyColumn(k)) {
              // Store daily record (including 0 values)
              dailyRecords[k] = val;
              if (val > 0) {
                  // 只累加 Mon-Sun / 日期列，忽略其它数值（例如 converter 区域的 mi / km）
              calcSum += val;
                  frequency++;
              }
          }
      });

      // Use sum as fallback if no total key or distance is 0
      if (!totalKey || distance === 0) {
          distance = calcSum;
      }

      return { distance, frequency, dailyRecords };
  };

  // Save supply station team result directly to the weekly sheet
  // We add a "补给站搭档" or "Supply Station Partner" column to mark the team members
  const saveSupplyStationTeam = async (weekId: string, runner1: string, runner2: string, retryCount = 0) => {
    if (!LUCKY_DRAW_SCRIPT_URL) {
      console.warn('[Supply Station] Script URL not configured, skipping save');
      return false;
    }
    
    const maxRetries = 2;
    const payload = {
      action: 'saveSupplyStationTeam',
      weekId: weekId,
      runner1: runner1.trim(),
      runner2: runner2.trim()
    };
    
    try {
      console.log(`[Supply Station] 💾 Saving team to weekly sheet (attempt ${retryCount + 1}/${maxRetries + 1}):`, payload);
      console.log('[Supply Station] Script URL:', LUCKY_DRAW_SCRIPT_URL);
      console.log('[Supply Station] Full request URL:', LUCKY_DRAW_SCRIPT_URL);
      console.log('[Supply Station] Request payload:', JSON.stringify(payload, null, 2));
      
      // Use the same script URL as lucky draw
      const response = await fetch(LUCKY_DRAW_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'text/plain' 
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      console.log('[Supply Station] ✅ Response status:', response.status);
      console.log('[Supply Station] 📦 Server Response:', result); // 这里会打印服务端返回的 success: true/false

      if (!result.success) {
         console.error('[Supply Station] ❌ Server Error:', result.error);
         // 如果服务端报错，抛出异常进入 catch 块重试
         throw new Error(result.error || 'Server returned false success');
      }
      
      // Try to verify by reading back after a delay (best effort)
      setTimeout(async () => {
        try {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(weekId)}`;
          console.log('[Supply Station] 🔍 Verifying save by reading sheet:', csvUrl);
          const verifyRes = await fetch(csvUrl);
          if (verifyRes.ok) {
            const text = await verifyRes.text();
            console.log('[Supply Station] 📄 Sheet CSV content (first 500 chars):', text.substring(0, 500));
            
            // Check if partner column exists (兼容 '补给站组队' 旧数据)
            const hasPartnerColumn = text.includes('补给站搭档') || text.includes('Supply Station Partner') || text.includes('补给站组队');
            if (hasPartnerColumn) {
              console.log('[Supply Station] ✅ Verification: Partner column found in sheet');
              
              // Parse CSV to check if runner names are in partner column
              const lines = text.split('\n');
              if (lines.length > 0) {
                const headers = lines[0].split(',');
                const partnerColIndex = headers.findIndex(h => 
                  h.includes('补给站搭档') || h.includes('Supply Station Partner') || h.includes('补给站组队')
                );
                
                if (partnerColIndex >= 0) {
                  console.log('[Supply Station] 📍 Partner column index:', partnerColIndex);
                  // Check if runner1 or runner2 appears in partner column
                  for (let i = 1; i < lines.length; i++) {
                    const row = lines[i].split(',');
                    const nameInRow = row[0]?.trim().replace(/"/g, '');
                    const partnerInRow = row[partnerColIndex]?.trim().replace(/"/g, '');
                    
                    if (nameInRow === runner1 && partnerInRow === runner2) {
                      console.log('[Supply Station] ✅✅✅ VERIFIED: Team saved successfully!', {
                        runner1: nameInRow,
                        partner: partnerInRow
                      });
                      return true;
                    }
                    if (nameInRow === runner2 && partnerInRow === runner1) {
                      console.log('[Supply Station] ✅✅✅ VERIFIED: Team saved successfully!', {
                        runner1: nameInRow,
                        partner: partnerInRow
                      });
                      return true;
                    }
                  }
                  console.warn('[Supply Station] ⚠️ Partner column exists but team data not found. Please check Google Apps Script execution logs.');
                  
                  // Retry if not verified and retries left
                  if (retryCount < maxRetries) {
                    console.log(`[Supply Station] 🔄 Retrying save (${retryCount + 1}/${maxRetries})...`);
                    setTimeout(() => {
                      saveSupplyStationTeam(weekId, runner1, runner2, retryCount + 1);
                    }, 2000);
                  }
                } else {
                  console.warn('[Supply Station] ⚠️ Partner column header not found in parsed CSV');
                }
              }
            } else {
              console.error('[Supply Station] ❌ Verification FAILED: Partner column not found in sheet.');
              console.error('[Supply Station] 📋 Debugging checklist:');
              console.error('  1. ✅ Check Google Apps Script code is correct');
              console.error('  2. ⚠️ IMPORTANT: Script must be re-deployed after code changes!');
              console.error('  3. ✅ Check execution logs in Google Apps Script editor (View → Executions)');
              console.error('  4. ✅ Verify the deployment URL matches LUCKY_DRAW_SCRIPT_URL');
              console.error('  5. ✅ Check if weekId matches the sheet name exactly:', weekId);
              console.error('  6. ✅ Check if runner names match exactly:', { runner1, runner2 });
              
              // Retry if not verified and retries left
              if (retryCount < maxRetries) {
                console.log(`[Supply Station] 🔄 Retrying save (${retryCount + 1}/${maxRetries})...`);
                setTimeout(() => {
                  saveSupplyStationTeam(weekId, runner1, runner2, retryCount + 1);
                }, 2000);
              } else {
                console.error('[Supply Station] ❌ All retry attempts failed. Please check Google Apps Script execution logs manually.');
              }
            }
          } else {
            console.error('[Supply Station] ❌ Could not read sheet for verification:', verifyRes.status);
          }
        } catch (verifyError) {
          console.error('[Supply Station] ❌ Verification error:', verifyError);
        }
      }, 4000); // Increased delay to 4 seconds to allow Google Sheets to update
      
      return true; // Request sent successfully (even though we can't verify due to no-cors)
      
    } catch (error) {
      console.error('[Supply Station] ❌ Error saving team:', error);
      
      // Retry on error if retries left
      if (retryCount < maxRetries) {
        console.log(`[Supply Station] 🔄 Retrying save after error (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => {
          saveSupplyStationTeam(weekId, runner1, runner2, retryCount + 1);
        }, 2000);
      }
      
      return false;
    }
  };
  
  // Expose test function to window for manual testing in browser console
  if (typeof window !== 'undefined') {
    (window as any).testSupplyStationSave = async (weekId: string, runner1: string, runner2: string) => {
      console.log('🧪 Testing Supply Station Save...');
      console.log('Parameters:', { weekId, runner1, runner2 });
      const result = await saveSupplyStationTeam(weekId, runner1, runner2);
      console.log('Test result:', result);
      return result;
    };
    console.log('💡 Tip: You can test the save function manually by calling:');
    console.log('   window.testSupplyStationSave("W8", "bobo", "Annie")');
  }

  const processSheetsData = async (sheetsMap: Record<string, any[]>) => {
    const runnerTotals: Record<string, number> = {}; 
    const runnerWeekStreaks: Record<string, number> = {}; 
    const runnerNamesSet = new Set<string>();
    const calculatedPeriods: Period[] = [];
    // Track supply station team members for Total View
    const supplyStationTeamMembers: Set<string> = new Set();
    // Track supply station bonus for each runner (the original distance that was doubled)
    const supplyStationBonus: Record<string, number> = {};
    
    // Process Regular Weekly Sheets
    const weeklyKeys = Object.keys(sheetsMap).filter(k => k.startsWith('W'));
    
    // Sort keys: W1, W2, ... 
    const sortedSheetKeys = weeklyKeys.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    const totalWeeksProcessed = sortedSheetKeys.length;
    const reversedSheets = [...sortedSheetKeys].reverse();
    
    let activeCount = 0;
    let currentWeekDist = 0;
    
    // Identify the latest sheet (Current Week)
    const latestSheetName = reversedSheets.length > 0 ? reversedSheets[0] : "";
    const latestWeekRunnersList: string[] = [];

    // Supply Station Team Detection: Track cumulative distance to find the first runner who reached 5400km
    let cumulativeDistance = 0;
    let supplyStationTriggerRunner: { name: string; weekId: string } | null = null;
    let supplyStationTriggerWeek: string | null = null;

    // First pass: Process in chronological order (W1, W2, ...) to detect supply station trigger
    sortedSheetKeys.forEach(sheetName => {
        const sheetData = sheetsMap[sheetName] || [];
        
        // Process runners in this week to calculate cumulative distance
        sheetData.forEach(row => {
            const name = row['队员'] ? row['队员'].trim() : row['Name']?.trim();
            if (!name) return;
            
            const { distance: rawDistance, frequency } = analyzeRow(row);
            const hasWeeklyStreak = frequency >= 5;
            const bonusMultiplier = hasWeeklyStreak ? 1.2 : 1.0;
            const finalDistance = rawDistance * bonusMultiplier;
            
            if (finalDistance > 0) {
                const previousCumulative = cumulativeDistance;
                cumulativeDistance += finalDistance;
                
                // Detect if this runner's distance pushed us over 5400km
                if (previousCumulative < SUPPLY_STATION_KM && cumulativeDistance >= SUPPLY_STATION_KM && !supplyStationTriggerRunner) {
                    supplyStationTriggerRunner = { name, weekId: sheetName };
                    supplyStationTriggerWeek = sheetName;
                    console.log(`[Supply Station] 🎯 Trigger detected! Runner: ${name}, Week: ${sheetName}, Cumulative: ${cumulativeDistance.toFixed(1)}km`);
                }
            }
        });
    });

    // Log supply station detection result
    if (supplyStationTriggerRunner !== null) {
        const runner = supplyStationTriggerRunner as { name: string; weekId: string };
        const week = supplyStationTriggerWeek ?? 'unknown';
        console.log(`[Supply Station] ✅ Trigger runner found: ${runner.name} in ${week}`);
    } else {
        console.log(`[Supply Station] ⚠️ No trigger found. Current cumulative distance: ${cumulativeDistance.toFixed(1)}km (need ${SUPPLY_STATION_KM}km)`);
    }

    // Reset cumulative distance for second pass
    cumulativeDistance = 0;

    // Second pass: Process in reverse order (latest first) for display, and apply supply station bonus
    for (const sheetName of reversedSheets) {
        const sheetData = sheetsMap[sheetName] || [];
        const periodRunners: RunnerData[] = [];
        
        sheetData.forEach(row => {
            const name = row['队员'] ? row['队员'].trim() : row['Name']?.trim();
            if (!name) return;
            
            runnerNamesSet.add(name);
            const { distance: rawDistance, frequency, dailyRecords } = analyzeRow(row);
            const hasWeeklyStreak = frequency >= 5;

            // Check if this runner is part of supply station team (from sheet column)
            // Priority: "补给站搭档" (new column name) > "补给站组队" (old column name) > others
            const supplyStationPartner = row['补给站搭档']?.trim() || row['补给站组队']?.trim() || 
                                        row['Supply Station Partner']?.trim() || row['补给站伙伴']?.trim() || 
                                        row['supply station partner']?.trim();
            const isSupplyStationTeam = !!supplyStationPartner;

            // Apply 1.2x Bonus if they have a streak
            const bonusMultiplier = hasWeeklyStreak ? 1.2 : 1.0;
            let finalDistance = rawDistance * bonusMultiplier;
            let bonusDistance = finalDistance - rawDistance;

            // If this runner is part of supply station team (has partner in sheet), apply 2x bonus
            // Sheet stores raw distance, we apply 2x bonus here
            if (isSupplyStationTeam) {
                const originalAfterStreak = finalDistance; // Distance after streak bonus (1.2x if applicable)
                finalDistance = originalAfterStreak * 2; // Apply 2x for supply station
                bonusDistance = finalDistance - rawDistance; // Total bonus (streak + supply station)
                supplyStationTeamMembers.add(name);
                supplyStationBonus[name] = originalAfterStreak; // Store original (after streak) for Total View display
            }

            if (finalDistance > 0) {
                periodRunners.push({ 
                    name, 
                    distance: finalDistance,
                    rawDistance: rawDistance,
                    bonusDistance: bonusDistance,
                    hasStreak: hasWeeklyStreak,
                    dailyRecords: dailyRecords,
                    weekId: sheetName,
                    isSupplyStationTeam: isSupplyStationTeam,
                    supplyStationPartner: supplyStationPartner || undefined
                });
            }

            // Accumulate for Total View
            runnerTotals[name] = (runnerTotals[name] || 0) + finalDistance;
            if (hasWeeklyStreak) {
                runnerWeekStreaks[name] = (runnerWeekStreaks[name] || 0) + 1;
            }
        });

        // Apply Supply Station Team Bonus (2x for both runners in the trigger week)
        if (supplyStationTriggerRunner !== null && supplyStationTriggerWeek === sheetName) {
            const trigger = supplyStationTriggerRunner as { name: string; weekId: string };
            const triggerRunnerName = trigger.name;
            console.log(`[Supply Station] 🔍 Checking week ${sheetName} for trigger runner ${triggerRunnerName}`);
            // Find the trigger runner in this week's periodRunners
            const triggerRunner = periodRunners.find(r => r.name === triggerRunnerName);
            
            // ⚠️ 修复：检查整个触发周是否已经有任何团队数据存在（不仅仅是 triggerRunner）
            // 这样可以避免在已有团队的情况下创建新团队
            const existingTeamsInWeek = periodRunners.filter(r => r.isSupplyStationTeam && r.supplyStationPartner);
            const hasAnyTeamInSheet = existingTeamsInWeek.length > 0;
            
            // Check if trigger runner specifically has a partner
            const triggerHasPartner = triggerRunner?.isSupplyStationTeam && triggerRunner?.supplyStationPartner;
            
            if (hasAnyTeamInSheet) {
                // Team(s) already exist in sheet, use the existing data
                console.log(`[Supply Station] ✅ Team(s) already exist in sheet for ${sheetName}:`, 
                    existingTeamsInWeek.map(r => `${r.name} + ${r.supplyStationPartner}`).join(', '));
                console.log(`[Supply Station] 📊 Using existing team data - all team members already have 2x bonus applied from sheet data`);
                
                // Ensure all team members are marked (they should already be from sheet data)
                existingTeamsInWeek.forEach(runner => {
                    supplyStationTeamMembers.add(runner.name);
                    if (runner.supplyStationPartner) {
                        supplyStationTeamMembers.add(runner.supplyStationPartner);
                    }
                });
                
                // runnerTotals are already updated in the main loop when processing sheet data
            } else if (!hasAnyTeamInSheet && triggerRunner && periodRunners.length > 1) {
                // Team not yet saved, need to select and save
                // Select a partner from current week's runners (excluding trigger runner and those already in team)
                const eligiblePartners = periodRunners.filter(r => r.name !== triggerRunner.name && !r.isSupplyStationTeam);
                
                if (eligiblePartners.length > 0) {
                    // Create a simple hash from weekId and trigger name for consistent selection
                    const hash = (sheetName + triggerRunner.name).split('').reduce((acc, char) => {
                        return ((acc << 5) - acc) + char.charCodeAt(0);
                    }, 0);
                    const randomIndex = Math.abs(hash) % eligiblePartners.length;
                    const partner = eligiblePartners[randomIndex];
                    
                    // Save the team selection to the weekly sheet
                    console.log(`[Supply Station] 💾 Saving new team selection to weekly sheet: ${triggerRunner.name} + ${partner.name}`);
                    await saveSupplyStationTeam(sheetName, triggerRunner.name, partner.name);
                    
                    // Apply 2x bonus to both runners
                    const triggerOriginalDistance = triggerRunner.distance;
                    const triggerOriginalRawDistance = triggerRunner.rawDistance || triggerRunner.distance;
                    const partnerOriginalDistance = partner.distance;
                    const partnerOriginalRawDistance = partner.rawDistance || partner.distance;
                    
                    // Update the runner data
                    triggerRunner.rawDistance = triggerOriginalRawDistance;
                    triggerRunner.distance = triggerOriginalDistance * 2;
                    triggerRunner.bonusDistance = triggerRunner.distance - triggerOriginalRawDistance;
                    triggerRunner.isSupplyStationTeam = true;
                    triggerRunner.supplyStationPartner = partner.name;
                    supplyStationTeamMembers.add(triggerRunner.name);
                    supplyStationBonus[triggerRunner.name] = triggerOriginalDistance;
                    
                    partner.rawDistance = partnerOriginalRawDistance;
                    partner.distance = partnerOriginalDistance * 2;
                    partner.bonusDistance = partner.distance - partnerOriginalRawDistance;
                    partner.isSupplyStationTeam = true;
                    partner.supplyStationPartner = triggerRunner.name;
                    supplyStationTeamMembers.add(partner.name);
                    supplyStationBonus[partner.name] = partnerOriginalDistance;
                    
                    // Update runnerTotals
                    runnerTotals[triggerRunner.name] = (runnerTotals[triggerRunner.name] || 0) - triggerOriginalDistance + triggerRunner.distance;
                    runnerTotals[partner.name] = (runnerTotals[partner.name] || 0) - partnerOriginalDistance + partner.distance;
                    
                    console.log(`[Supply Station] ✅ Team formed and saved: ${triggerRunner.name} (${triggerOriginalDistance.toFixed(1)} → ${triggerRunner.distance.toFixed(1)}km) + ${partner.name} (${partnerOriginalDistance.toFixed(1)} → ${partner.distance.toFixed(1)}km) in ${sheetName}`);
                } else {
                    console.log(`[Supply Station] ⚠️ No eligible partners found for ${triggerRunner.name} in ${sheetName}`);
                }
            } else {
                // Trigger runner not found or insufficient runners
                if (!triggerRunner) {
                    console.warn(`[Supply Station] ⚠️ Trigger runner ${triggerRunnerName} not found in ${sheetName}`);
                } else if (periodRunners.length <= 1) {
                    console.warn(`[Supply Station] ⚠️ Not enough runners in ${sheetName} to form a team`);
                }
            }
            
            // Additional check: if trigger runner exists but wasn't processed above
            if (triggerRunner && !hasAnyTeamInSheet && periodRunners.length <= 1) {
                console.log(`[Supply Station] ℹ️ Cannot form team: only ${periodRunners.length} runner(s) in ${sheetName}`);
            }
        } else if (supplyStationTriggerRunner !== null && supplyStationTriggerWeek !== sheetName) {
            // This week is not the trigger week, but check if there are any teams from sheet data
            const existingTeamsInWeek = periodRunners.filter(r => r.isSupplyStationTeam && r.supplyStationPartner);
            if (existingTeamsInWeek.length > 0) {
                console.log(`[Supply Station] ℹ️ Found existing team(s) in non-trigger week ${sheetName}:`, 
                    existingTeamsInWeek.map(r => `${r.name} + ${r.supplyStationPartner}`).join(', '));
                existingTeamsInWeek.forEach(runner => {
                    supplyStationTeamMembers.add(runner.name);
                    if (runner.supplyStationPartner) {
                        supplyStationTeamMembers.add(runner.supplyStationPartner);
                    }
                });
            }
        }

        // Add to Period List
        periodRunners.sort((a, b) => b.distance - a.distance);
        calculatedPeriods.push({
            label: getWeekLabel(sheetName),
            runners: periodRunners,
            weekId: sheetName
        });

        // Current Week Stats Calculation
        if (sheetName === latestSheetName) {
            activeCount = periodRunners.length;
            currentWeekDist = periodRunners.reduce((sum, r) => sum + r.distance, 0);
            // Capture runners for Lucky Draw (Only those with distance > 0)
            latestWeekRunnersList.push(...periodRunners.map(r => r.name));
        }
    }

    // Build Total Leaderboard
    // Find supply station partners for Total View from calculatedPeriods
    const supplyStationPartners: Record<string, string> = {};
    calculatedPeriods.forEach(period => {
        if (period.weekId && period.runners) {
            period.runners.forEach(runner => {
                if (runner.isSupplyStationTeam && runner.supplyStationPartner) {
                    supplyStationPartners[runner.name] = runner.supplyStationPartner;
                }
            });
        }
    });
    
    const totalRunners: RunnerData[] = Array.from(runnerNamesSet).map(name => ({
        name,
        distance: runnerTotals[name] || 0,
        streakCount: runnerWeekStreaks[name] || 0, 
        isPerfect: (runnerWeekStreaks[name] || 0) === totalWeeksProcessed && totalWeeksProcessed > 0,
        isSupplyStationTeam: supplyStationTeamMembers.has(name),
        supplyStationPartner: supplyStationPartners[name],
        bonusDistance: supplyStationBonus[name] // Store bonus for Total View display
    })).filter(r => r.distance > 0).sort((a, b) => b.distance - a.distance);

    calculatedPeriods.unshift({
        label: 'Total Distance',
        runners: totalRunners,
        weekId: undefined // Total view has no weekId
    });

    // Process Gallery Sheet if available
    // MATCH KEY: Use 'Media Storage' as we are fetching that specific sheet name now
    const uploadSheet = sheetsMap['Media Storage'] || [];
    console.log("[App] Raw Gallery Data:", uploadSheet);

    const gallery: GalleryItem[] = uploadSheet.map(row => {
        // Robust Column Matching
        const keys = Object.keys(row);
        
        // 1. Find URL Column
        let url = row['Url'] || row['url'] || row['URL'] || row['Link'] || row['link'];
        if (!url) {
            // Find any value starting with http
            const urlKey = keys.find(k => typeof row[k] === 'string' && row[k].startsWith('http'));
            if (urlKey) url = row[urlKey];
        }

        // 2. Find Name Column
        let name = row['Name'] || row['name'] || row['NAME'] || row['Runner'] || row['runner'];
        if (!name) {
             const nameKey = keys.find(k => /name|runner|队员/i.test(k));
             if (nameKey) name = row[nameKey];
        }

        // 3. Find Timestamp Column
        let timestamp = row['Timestamp'] || row['Date'] || row['date'] || row['time'];

        return {
            name: name || 'Runner',
            url: url || '',
            timestamp: timestamp || ''
        };
    }).filter(item => {
        // Only keep items with a valid image/gif URL
        return item.url && (item.url.includes('http') || item.url.includes('base64'));
    }).reverse(); // Newest first

    console.log("[App] Processed Gallery:", gallery);

    // Update State
    setTotalDistance(totalRunners.reduce((sum, r) => sum + r.distance, 0));
    setPeriods(calculatedPeriods);
    setActiveRunnersThisWeek(activeCount);
    setDistanceThisWeek(currentWeekDist);
    
    // Set Lucky Challenge Data
    console.log('[App] Setting Lucky Challenge Data - latestSheetName:', latestSheetName, 'runners count:', latestWeekRunnersList.length);
    setCurrentWeekId(latestSheetName);
    setCurrentWeekRunners(latestWeekRunnersList);
    
    // Set Gallery Data
    setGalleryItems(gallery);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    if (SPREADSHEET_ID.includes('PLACEHOLDER')) {
        setError("Spreadsheet ID is not configured.");
        setLoading(false);
        return;
    }

    const sheetsMap: Record<string, any[]> = {};
    let weekNum = 1;
    let firstSheetText: string | null = null;
    let uploadsData: any[] | null = null;
    
    try {
      // 1. Fetch "Media Storage" sheet for Gallery (Matching GAS script)
      try {
          // Note: The sheet name in the URL parameter must match the tab name in Google Sheets
          const uploadsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Media%20Storage`;
          const uploadsRes = await fetch(uploadsUrl);
          if (uploadsRes.ok) {
              const text = await uploadsRes.text();
              if (!text.includes('google.visualization.Query.setResponse')) {
                 const data = await parseCSV(text);
                 if (data && data.length > 0) {
                     sheetsMap['Media Storage'] = data;
                     uploadsData = data; // Store reference to detect duplicates
                 }
              }
          }
      } catch (e) {
          console.warn("Could not fetch 'Media Storage' sheet.");
      }
      
      // Fallback for "Uploads" if "Media Storage" fails (Legacy support)
      if (!uploadsData) {
        try {
            const uploadsUrlLC = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Uploads`;
            const uploadsResLC = await fetch(uploadsUrlLC);
            if (uploadsResLC.ok) {
                const textLC = await uploadsResLC.text();
                if (!textLC.includes('google.visualization.Query.setResponse')) {
                    const dataLC = await parseCSV(textLC);
                    if (dataLC && dataLC.length > 0) {
                        sheetsMap['Media Storage'] = dataLC; // Map to same key for processing
                        uploadsData = dataLC;
                    }
                }
            }
        } catch (e2) {}
      }

      // 2. Loop to fetch Weekly sheets
      while (true) {
          const sheetName = `W${weekNum}`;
          const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
          
          try {
              const res = await fetch(url);
              if (!res.ok) throw new Error("Fetch failed");
              
              const text = await res.text();
              if (text.trim().startsWith('<!DOCTYPE') || text.includes('gviz-response-status-error')) {
                  break;
              }

              if (weekNum === 1) {
                  firstSheetText = text;
              } else if (firstSheetText && text === firstSheetText) {
                  break;
              }

              const data = await parseCSV(text);
              if (!data || data.length === 0) break; 

              // --- CRITICAL FIX: Detect if this is actually the Uploads/Media sheet returned by default ---
              const headers = Object.keys(data[0] || {});
              const hasUrl = headers.some(h => /url|link/i.test(h));
              const hasTimestamp = headers.some(h => /timestamp|date/i.test(h));
              const hasDistance = headers.some(h => /distance|total|run|km|mile/i.test(h));
              
              // If it has Url+Timestamp but NO Distance column, it's definitely the Media sheet
              if (hasUrl && hasTimestamp && !hasDistance) {
                  console.log(`[Fetch] Stopping at ${sheetName} because it looks like the Media sheet.`);
                  break;
              }

              // Double check against fetched uploads data if available
              if (uploadsData && JSON.stringify(data[0]) === JSON.stringify(uploadsData[0])) {
                  console.log(`[Fetch] Stopping at ${sheetName} because content matches Media sheet.`);
                  break;
              }

              sheetsMap[sheetName] = data;
              weekNum++;
              // Safety limit
              if (weekNum > 52) break;
          } catch (err) {
              break;
          }
      }

      if (Object.keys(sheetsMap).length === 0) {
          throw new Error("No data found.");
      }

      await processSheetsData(sheetsMap);
      setLoading(false);

    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError("Failed to fetch data.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const progressPercentage = Math.min(100, Math.max(0, (totalDistance / GOAL_KM) * 100));

  return (
    <div className="min-h-screen text-slate-100 pb-12 relative">
      {/* Replaces old static background divs */}
      <BackgroundEffects />

      <main className="relative z-10 max-w-lg mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-6xl px-4 flex flex-col gap-8">
        
        <HeroSection />

        <div className="flex justify-between items-center -mt-4">
           <div className="text-amber-500 text-xs flex items-center gap-1 h-6">
             {error && (
               <>
                 <AlertCircle size={12} />
                 <span>{error}</span>
               </>
             )}
           </div>
           <button 
             onClick={fetchData} 
             disabled={loading}
             className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
           >
             <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
             {loading ? "Updating..." : "Refresh Data"}
           </button>
        </div>

        <MapSection progressPercentage={progressPercentage} totalDistance={totalDistance} />

        <StatsSection 
            totalDistance={totalDistance} 
            goalDistance={GOAL_KM}
            activeRunnersCount={activeRunnersThisWeek}
            distanceThisWeek={distanceThisWeek}
        />

        <LuckyChallenge 
            currentWeekRunners={currentWeekRunners} 
            weekId={currentWeekId}
            onUploadClick={() => setIsUploadModalOpen(true)}
            spreadsheetId={SPREADSHEET_ID}
            luckyDrawScriptUrl={LUCKY_DRAW_SCRIPT_URL}
            luckyDrawSheetName={LUCKY_DRAW_SHEET_NAME}
        />

        <GallerySection items={galleryItems} />
        
        <Leaderboard periods={periods} />

      </main>

      <footer className="relative z-10 text-center text-slate-500 text-sm mt-12 mb-6">
        <p className="flex items-center justify-center gap-2">
          <Snowflake size={14} />
          <span>Made for the Winter Training Group</span>
          <Snowflake size={14} />
        </p>
        <p className="mt-2 text-xs opacity-60">© 2025 Run Back Home Challenge</p>
      </footer>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <UploadModal 
          onClose={() => setIsUploadModalOpen(false)} 
          onUploadSuccess={() => {
              setIsUploadModalOpen(false);
              fetchData(); // Refresh to show new image
          }}
          cloudName={CLOUD_NAME}
          uploadPreset={UPLOAD_PRESET}
          googleScriptUrl={GOOGLE_SCRIPT_URL}
        />
      )}
    </div>
  );
}
