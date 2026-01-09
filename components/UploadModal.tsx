import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, CheckCircle, AlertTriangle, Loader2, Video } from 'lucide-react';

interface UploadModalProps {
    onClose: () => void;
    onUploadSuccess: () => void;
    cloudName: string;
    uploadPreset: string;
    googleScriptUrl: string;
}

// Extend Window interface for Cloudinary
declare global {
    interface Window {
        cloudinary: any;
    }
}

export const UploadModal: React.FC<UploadModalProps> = ({ 
    onClose, 
    onUploadSuccess,
    cloudName,
    uploadPreset,
    googleScriptUrl
}) => {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting_sheet' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    
    // Fix: Use useRef to track the current name value across closures without re-initializing the widget
    const nameRef = useRef(name);
    
    // Keep the ref in sync with state
    useEffect(() => {
        nameRef.current = name;
    }, [name]);

    const widgetRef = useRef<any>(null);

    // Effect to check and wait for Cloudinary script
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;
        let attempts = 0;
        const maxAttempts = 50; // Try for about 5 seconds

        const initWidget = () => {
            if (window.cloudinary) {
                try {
                    // Only create the widget once (dependencies no longer include 'name')
                    widgetRef.current = window.cloudinary.createUploadWidget({
                        cloudName: cloudName, 
                        uploadPreset: uploadPreset,
                        sources: ['local', 'camera'], 
                        resourceType: 'video', // Enforce video only      
                        // Adjusted to 500MB as requested
                        maxFileSize: 500000000, 
                        folder: 'winter_run_challenge', 
                        // Restricted to video formats only
                        clientAllowedFormats: ['mp4', 'mov', 'webm', 'avi'], 
                        singleUploadAutoClose: false,
                        styles: {
                            palette: {
                                window: "#1e1e1e", 
                                sourceBg: "#1e1e1e",
                                windowBorder: "#90a0b3",
                                tabIcon: "#0094c7",
                                inactiveTabIcon: "#69778a",
                                menuIcons: "#0094c7",
                                link: "#53ad9d",
                                action: "#8F5DA5",
                                inProgress: "#0194c7",
                                complete: "#53ad9d",
                                error: "#c43737",
                                textDark: "#000000",
                                textLight: "#FFFFFF"
                            }
                        }
                    }, (error: any, result: any) => { 
                        if (!error && result && result.event === "success") { 
                            console.log('Upload Success:', result.info);
                            const path = result.info.path; 
                            const resType = result.info.resource_type || 'video';
                            // Force MP4 format for WeChat browser compatibility
                            // Use e_accelerate:200 to speed up video to 2x during upload (server-side processing)
                            // This is better than client-side playbackRate as it creates a smaller file and works in all browsers
                            const finalUrl = `https://res.cloudinary.com/${cloudName}/${resType}/upload/f_mp4,q_auto,w_400,c_fill,e_accelerate:200/${path}`;
                            
                            // CRITICAL FIX: Use nameRef.current to get the latest name value inside this callback
                            handleGoogleSheetSubmit(nameRef.current, finalUrl);
                        } else if (error) {
                            console.error("Cloudinary Widget Error:", error);
                            if (error.statusText && error.statusText.includes("exceeds maximum allowed")) {
                                setErrorMessage("File is too large (Limit: 500MB). Please compress it.");
                            } else if (error.statusText === "Unauthorized") {
                                setErrorMessage("Error: Upload Preset Issue. Please contact admin.");
                            }
                        }
                    });
                    setIsScriptLoaded(true);
                    return true;
                } catch (e) {
                    console.error("Failed to initialize Cloudinary widget", e);
                    return false;
                }
            }
            return false;
        };

        // Attempt immediately
        if (!initWidget()) {
            // If failed, poll for it
            intervalId = setInterval(() => {
                attempts++;
                if (initWidget() || attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    if (attempts >= maxAttempts) {
                        setErrorMessage("Failed to load upload component. Please refresh.");
                    }
                }
            }, 100);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [cloudName, uploadPreset]); // 'name' is removed from dependencies to prevent widget re-creation

    const openWidget = () => {
        if (!name.trim()) {
            setErrorMessage("请先输入名字！(Please enter your name first)");
            return;
        }
        
        if (!isScriptLoaded || !widgetRef.current) {
            setErrorMessage("Component loading... please wait a moment.");
            return;
        }

        setErrorMessage('');
        widgetRef.current.open();
    };

    const handleGoogleSheetSubmit = async (runnerName: string, videoUrl: string) => {
        setStatus('submitting_sheet');

        // FIXED: Use standard JSON object. 
        // This works best with the GAS JSON.parse(e.postData.contents) logic.
        const payload = {
            name: runnerName,
            url: videoUrl,
            timestamp: new Date().toLocaleString()
        };

        console.log("Submitting payload to Sheet:", payload);

        try {
            // CRITICAL CHANGE: 
            // 1. method: 'POST'
            // 2. mode: 'no-cors' (Required for GAS web apps simple triggers)
            // 3. headers: 'Content-Type': 'text/plain' 
            //    Using 'text/plain' prevents the browser from sending a CORS Preflight (OPTIONS) request,
            //    which GAS often fails to handle correctly. The body is still valid JSON string.
            await fetch(googleScriptUrl, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 
                    'Content-Type': 'text/plain' 
                },
                body: JSON.stringify(payload)
            });
            
            // Because mode is no-cors, we can't read the response status/body.
            // We assume success if no network error was thrown.
            setStatus('success');
            setTimeout(() => {
                onUploadSuccess();
            }, 2000);

        } catch (gasErr: any) {
            console.error("Google Sheet Error:", gasErr);
            setErrorMessage("Upload happened but failed to save to list. Please contact admin.");
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6 shadow-2xl animate-fadeIn">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <UploadCloud className="text-amber-500" />
                    幸运挑战视频 (Check-in)
                </h2>
                <p className="text-slate-400 text-sm mb-6">Upload your workout video (Max 500MB).</p>

                {status === 'success' ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Check-in Successful!</h3>
                        <p className="text-slate-400">Refreshing gallery...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {status === 'submitting_sheet' ? (
                            <div className="text-center py-8 space-y-4">
                                <Loader2 size={48} className="animate-spin text-amber-500 mx-auto" />
                                <p className="text-white font-medium">Saving your run...</p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Runner Name</label>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name (e.g. Runner A)"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>

                                {errorMessage && (
                                    <div className="flex items-start gap-2 bg-red-900/20 text-red-200 p-3 rounded-lg text-sm border border-red-900/50">
                                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                {!isScriptLoaded && !errorMessage && (
                                     <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
                                        <Loader2 size={12} className="animate-spin" />
                                        Initializing uploader...
                                     </div>
                                )}

                                <div className="pt-2">
                                    <button 
                                        onClick={openWidget}
                                        disabled={!isScriptLoaded}
                                        className={`w-full font-bold py-3 px-6 rounded-full shadow-lg transition transform flex items-center justify-center gap-2
                                            ${!isScriptLoaded 
                                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                                                : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                                            }`}
                                    >
                                        <Video size={20} />
                                        📹 上传视频
                                    </button>
                                    <p className="text-center text-xs text-slate-500 mt-3">
                                        Supports video (auto 2x speed).
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};