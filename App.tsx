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

// Updated Goal: 10,000km to Mohe (Arctic City)
const GOAL_KM = 10000;
// W1 Start Date: Dec 15, 2025 (As requested)
const START_DATE = new Date('2025-12-15T00:00:00'); 

interface RunnerData {
  name: string;
  distance: number;
  hasStreak?: boolean; // Weekly >= 5 runs
  isPerfect?: boolean; // Maintained streak every week since W1
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

  // Analyze row to get Distance AND Frequency (Run Count)
  const analyzeRow = (row: any): { distance: number, frequency: number } => {
      const keys = Object.keys(row);
      const totalKey = keys.find(k => /distance|km|mile|total/i.test(k) && !/name|队员/i.test(k));
      let distance = 0;
      let frequency = 0;

      if (totalKey) {
          distance = parseFloat(row[totalKey]) || 0;
      }

      let calcSum = 0;
      keys.forEach(k => {
          // Exclude Name columns
          if (k.includes('队员') || k.includes('Name')) return;
          // Exclude the Total column itself
          if (totalKey && k === totalKey) return; 
          // Exclude Timestamp/Date/Url/Link columns explicitly to prevent parsing dates as distance
          if (/timestamp|date|time|url|link|video|image/i.test(k)) return;

          const val = parseFloat(row[k]);
          if (!isNaN(val) && val > 0) {
              frequency++; 
              calcSum += val;
          }
      });

      if (!totalKey) {
          distance = calcSum;
      }

      return { distance, frequency };
  };

  const processSheetsData = (sheetsMap: Record<string, any[]>) => {
    const runnerTotals: Record<string, number> = {}; 
    const runnerWeekStreaks: Record<string, number> = {}; 
    const runnerNamesSet = new Set<string>();
    const calculatedPeriods: Period[] = [];
    
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

    reversedSheets.forEach(sheetName => {
        const sheetData = sheetsMap[sheetName] || [];
        const periodRunners: RunnerData[] = [];
        
        sheetData.forEach(row => {
            const name = row['队员'] ? row['队员'].trim() : row['Name']?.trim();
            if (!name) return;
            
            runnerNamesSet.add(name);
            const { distance, frequency } = analyzeRow(row);
            
            const hasWeeklyStreak = frequency >= 5;

            // Stats for this specific week
            if (distance > 0) {
                periodRunners.push({ 
                    name, 
                    distance,
                    hasStreak: hasWeeklyStreak, 
                    isPerfect: false 
                });
            }

            // Accumulate Data for Total View
            runnerTotals[name] = (runnerTotals[name] || 0) + distance;
            
            if (hasWeeklyStreak) {
                runnerWeekStreaks[name] = (runnerWeekStreaks[name] || 0) + 1;
            }
        });

        // Add to Period List
        periodRunners.sort((a, b) => b.distance - a.distance);
        calculatedPeriods.push({
            label: getWeekLabel(sheetName),
            runners: periodRunners
        });

        // Current Week Stats Calculation
        if (sheetName === latestSheetName) {
            activeCount = periodRunners.length;
            currentWeekDist = periodRunners.reduce((sum, r) => sum + r.distance, 0);
            // Capture runners for Lucky Draw (Only those with distance > 0)
            latestWeekRunnersList.push(...periodRunners.map(r => r.name));
        }
    });

    // Build Total Leaderboard
    const totalRunners: RunnerData[] = Array.from(runnerNamesSet).map(name => ({
        name,
        distance: runnerTotals[name] || 0,
        hasStreak: false, 
        isPerfect: (runnerWeekStreaks[name] || 0) === totalWeeksProcessed && totalWeeksProcessed > 0
    })).filter(r => r.distance > 0).sort((a, b) => b.distance - a.distance);

    calculatedPeriods.unshift({
        label: 'Total Distance',
        runners: totalRunners
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

      processSheetsData(sheetsMap);
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

        <MapSection progressPercentage={progressPercentage} />

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