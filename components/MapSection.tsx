import React, { useMemo, useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { divIcon, icon } from 'leaflet';
import { Crosshair } from 'lucide-react';

// Coordinates (The "Perfect 10k" Route)
const COORDS_DC: [number, number] = [38.9072, -77.0369];
const COORDS_ANCHORAGE: [number, number] = [61.2181, -149.9003]; // Critical Waypoint
const COORDS_MOHE: [number, number] = [53.4846, 122.3705];

interface MapSectionProps {
  progressPercentage: number;
}

// Custom Icons
const dcStartIcon = divIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex items-center justify-center w-8 h-8">
      <div class="absolute w-full h-full bg-blue-500 rounded-full opacity-75 animate-ping"></div>
      <div class="relative w-3 h-3 bg-blue-600 border-2 border-white rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16], 
});

const aidStationIcon = divIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex flex-col items-center justify-center w-12 h-12 group hover:scale-110 transition-transform">
      <div class="absolute w-10 h-10 bg-amber-400/30 rounded-full animate-pulse"></div>
      <div class="relative w-8 h-8 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10 overflow-hidden">
         <!-- Coffee/Hot Drink Icon -->
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
      </div>
      <div class="absolute -bottom-4 bg-slate-900/90 backdrop-blur text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30 whitespace-nowrap z-20 shadow-md">
        SUPPLY
      </div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const finishLineIcon = divIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex flex-col items-center justify-end w-12 h-16 group hover:-translate-y-1 transition-transform">
       <div class="text-4xl drop-shadow-2xl filter transform -rotate-6 origin-bottom-left">🏁</div>
       <div class="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full -mt-2 shadow-sm border border-white/20 z-10">
         FINISH
       </div>
    </div>
  `,
  iconSize: [48, 64],
  iconAnchor: [24, 58], 
  popupAnchor: [0, -50]
});

// Helper to strictly validate LatLng
const isValidLatLng = (coords: any): coords is [number, number] => {
    if (!Array.isArray(coords) || coords.length !== 2) return false;
    const [lat, lng] = coords;
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
};

// Math Helpers for Geodesic Calculation
const toRad = (d: number) => d * Math.PI / 180;
const toDeg = (r: number) => r * 180 / Math.PI;

// Raw Great Circle Points Generator (No wrapping logic yet)
const getRawGreatCirclePoints = (start: [number, number], end: [number, number], numPoints: number) => {
    const lat1 = toRad(start[0]);
    const lon1 = toRad(start[1]);
    const lat2 = toRad(end[0]);
    const lon2 = toRad(end[1]);

    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));
    
    const points: [number, number][] = [];

    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);
        
        const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
        const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);
        
        const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
        const lon = Math.atan2(y, x);
        
        points.push([toDeg(lat), toDeg(lon)]);
    }
    return points;
};

// Unwrap logic to prevent lines crossing the map incorrectly
const unwrapPath = (points: [number, number][]) => {
    if (points.length === 0) return [];
    const unwrapped: [number, number][] = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const prev = unwrapped[i - 1];
        const curr = [...points[i]] as [number, number];
        
        let dLon = curr[1] - prev[1];
        if (dLon > 180) curr[1] -= 360;
        else if (dLon < -180) curr[1] += 360;

        unwrapped.push(curr);
    }
    return unwrapped;
};

// Route Generator combining two segments
const generateFullRoute = () => {
    // Segment 1: DC -> Anchorage (approx 5400km)
    const leg1 = getRawGreatCirclePoints(COORDS_DC, COORDS_ANCHORAGE, 150);
    // Segment 2: Anchorage -> Mohe (approx 4700km)
    const leg2 = getRawGreatCirclePoints(COORDS_ANCHORAGE, COORDS_MOHE, 150);
    
    // Combine (remove duplicate join point)
    const rawPath = [...leg1, ...leg2.slice(1)];
    
    return unwrapPath(rawPath);
};

// Location Label Logic for the DC -> Anchorage -> Mohe Route
const getLocationLabel = (lat: number, lng: number): string => {
  // Normalize longitude for simple region checks if needed, 
  // though unwrapped coords might be < -180.
  // We use the raw values relative to known regions.
  
  // 1. DC to Canada Border
  if (lng > -80 && lat < 45) return "US East Coast";
  if (lng > -95 && lat < 50) return "Great Lakes Region";
  
  // 2. Canada Crossing
  if (lng > -115 && lat >= 48) return "Canadian Prairies (Saskatchewan/Alberta)";
  if (lng > -135 && lat > 50) return "Canadian Rockies (BC/Yukon)";
  if (lng > -141 && lat > 55) return "Yukon Territory";
  
  // 3. Alaska
  if (lng <= -141 && lng > -160) return "Alaska (Approaching Anchorage)";
  if (lng <= -160 && lng > -170) return "Western Alaska / Bering Sea Coast";

  // 4. Bering Strait / Ocean crossing (Lng usually < -170 or jumps)
  // Our unwrapped longitude will be very negative (e.g. -170, -190...)
  if (lng <= -170 && lng > -190) return "Crossing the Bering Sea";
  
  // 5. Russia
  if (lng <= -190 && lng > -210) return "Russian Far East (Chukotka/Kamchatka)"; // -170E to -150E equivalent
  if (lng <= -210 && lng > -225) return "Sea of Okhotsk / Magadan";
  if (lng <= -225 && lat > 53.5) return "Eastern Siberia (Amur Region)";
  
  // 6. Arrival
  if (lat <= 53.6 && lng < -230) return "Approaching Mohe";

  return "En Route to Spring";
};

// --- Map Controller Component ---
const MapController = ({ targetPosition, setZoom }: { targetPosition: [number, number], setZoom: (z: number) => void }) => {
    const map = useMap();
    const isFirstRun = useRef(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
            if (targetPosition) {
                map.setView(targetPosition, map.getZoom(), { animate: false });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    useEffect(() => {
        if (!isValidLatLng(targetPosition)) return;

        map.options.scrollWheelZoom = 'center';

        if (isFirstRun.current) {
            map.setView(targetPosition, 3, { animate: false });
            isFirstRun.current = false;
        } else {
            map.setView(targetPosition, map.getZoom(), { 
                animate: true, 
                duration: 1,
                easeLinearity: 0.25 
            });
        }
    }, [map, targetPosition]);

    useMapEvents({
        zoomend: () => {
            setZoom(map.getZoom());
            map.panTo(targetPosition, { animate: true, duration: 0.5 });
        }
    });

    return null;
}

// --- Main Component ---
export const MapSection: React.FC<MapSectionProps> = ({ progressPercentage }) => {
  const [currentZoom, setCurrentZoom] = useState(3);

  // Memoize path data
  const { pathData, currentPos, completedPath, remainingPath } = useMemo(() => {
    const path = generateFullRoute();
    
    // Fallback
    const defaultPos = COORDS_DC;
    if (path.length === 0) {
        return { pathData: [], currentPos: defaultPos, completedPath: [], remainingPath: [] };
    }

    const totalPoints = path.length;
    const progressIndex = Math.min(
        Math.floor((progressPercentage / 100) * totalPoints), 
        totalPoints - 1
    );

    const pos = path[progressIndex] || path[0]; 
    
    return {
        pathData: path,
        currentPos: pos,
        completedPath: path.slice(0, progressIndex + 1),
        remainingPath: path.slice(progressIndex)
    };
  }, [progressPercentage]);

  // Dynamic Icon Sizing
  const dynamicRunnerIcon = useMemo(() => {
      const rawSize = currentZoom * 12 + 10; 
      const size = Math.max(60, Math.min(240, rawSize));
      
      return icon({
          iconUrl: '/horse_runner.png', // Changed from remote URL to local public file
          iconSize: [size, size],
          iconAnchor: [size / 2, size * 0.9], 
          popupAnchor: [0, -size * 0.8],
          className: 'drop-shadow-lg transition-all duration-300'
      });
  }, [currentZoom]);

  const locationLabel = useMemo(() => {
    if (!isValidLatLng(currentPos)) return "Unknown";
    return getLocationLabel(currentPos[0], currentPos[1]);
  }, [currentPos]);

  // Visual End Pos should be the last point of the path to match the line drawing
  const visualEndPos = pathData.length > 0 ? pathData[pathData.length - 1] : COORDS_MOHE;

  return (
    <section className="w-full bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
        <h3 className="font-bold text-slate-200">Live Tracker</h3>
        <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded hidden sm:inline-block">
                Route: DC ➔ Anchorage ➔ Mohe
            </span>
        </div>
      </div>

      <div className="h-64 md:h-96 w-full relative z-0 group">
        <MapContainer 
          center={currentPos} 
          zoom={3} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          attributionControl={false}
          worldCopyJump={false}
        >
          {isValidLatLng(currentPos) && (
              <MapController targetPosition={currentPos} setZoom={setCurrentZoom} />
          )}
          
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />
          
          {remainingPath.length > 1 && (
              <Polyline 
                positions={remainingPath} 
                pathOptions={{ 
                    color: '#94a3b8', 
                    weight: 2, 
                    opacity: 0.6, 
                    dashArray: '4, 6'
                }} 
              />
          )}

          {completedPath.length > 1 && (
            <>
                <Polyline 
                    positions={completedPath} 
                    pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.4}} 
                />
                <Polyline 
                    positions={completedPath} 
                    pathOptions={{ color: '#f87171', weight: 3, opacity: 1}} 
                />
            </>
          )}

          <Marker position={COORDS_DC} icon={dcStartIcon}>
             <Popup>Washington DC (Start)</Popup>
          </Marker>

          {/* Waypoint: Anchorage (Supply Station) */}
          <Marker position={COORDS_ANCHORAGE} icon={aidStationIcon}>
              <Popup>
                  <div className="text-center text-slate-800">
                      <strong>Anchorage, AK</strong>
                      <p className="text-xs">Winter Supply Station ☕</p>
                  </div>
              </Popup>
          </Marker>

          {/* Destination: Mohe (Finish Line) */}
          <Marker position={visualEndPos} icon={finishLineIcon}>
             <Popup>
               <div className="text-center">
                 <p className="font-bold text-red-600">终点：神州北极 (Mohe)</p>
                 <p className="text-xs text-slate-600 mt-1">10,000km 达成！</p>
               </div>
             </Popup>
          </Marker>

          {isValidLatLng(currentPos) && (
            <Marker 
                position={currentPos} 
                icon={dynamicRunnerIcon}
                zIndexOffset={1000} 
            >
                <Popup>
                    <div className="text-center min-w-[140px]">
                        <p className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">Current Location</p>
                        <p className="text-sm text-indigo-700 font-semibold mb-1">{locationLabel}</p>
                        <div className="bg-red-50 p-1 rounded border border-red-100">
                          <p className="text-xs font-bold text-red-600">
                              {progressPercentage.toFixed(1)}% Complete
                          </p>
                        </div>
                    </div>
                </Popup>
            </Marker>
          )}
        </MapContainer>
        
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur px-3 py-2 rounded border border-white/20 z-[400] text-xs shadow-lg pointer-events-none">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                <span className="text-white font-medium">Live Tracking Active</span>
            </div>
        </div>

        <div className="absolute top-4 right-4 z-[400]">
             <button 
                className="bg-slate-900/80 backdrop-blur text-white p-2 rounded-lg border border-slate-600 hover:bg-amber-600 transition-colors shadow-xl"
                title="Tracking Runner"
             >
                <Crosshair size={20} className="text-amber-400" />
             </button>
        </div>
      </div>
    </section>
  );
}