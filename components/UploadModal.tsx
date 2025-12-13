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
    const widgetRef = useRef<any>(null);

    // Initialize Widget once on mount
    useEffect(() => {
        if (window.cloudinary && !widgetRef.current) {
            try {
                widgetRef.current = window.cloudinary.createUploadWidget({
                    cloudName: cloudName, 
                    uploadPreset: uploadPreset,
                    sources: ['local', 'camera'], 
                    // Change resourceType to 'auto' to prevent hangs if preset has strict type settings.
                    // We still restrict to video files using clientAllowedFormats.
                    resourceType: 'auto',       
                    maxFileSize: 550000000,      // 550MB (slightly buffered)
                    folder: 'winter_run_challenge', 
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
                        
                        // Construct URL: Auto format (usually mp4/webm), Quality Auto, Width 400, Crop Fill, Accelerate 2x, No Audio
                        // Note: We use resource_type from result to be safe, though usually it is 'video'
                        const resType = result.info.resource_type || 'video';
                        const finalUrl = `https://res.cloudinary.com/${cloudName}/${resType}/upload/f_auto,q_auto,w_400,c_fill,e_accelerate:200,ac_none/${path}`;
                        
                        handleGoogleSheetSubmit(name, finalUrl);
                    } else if (error) {
                        console.error("Cloudinary Widget Error:", error);
                        // Often the widget handles its own UI errors, but logging helps debug.
                        if (error.statusText === "Unauthorized") {
                             alert("Error: Upload Preset seems to be Signed. Please set it to 'Unsigned' in Cloudinary Settings.");
                        }
                    }
                });
            } catch (e) {
                console.error("Failed to initialize Cloudinary widget", e);
            }
        }
    }, [cloudName, uploadPreset, name]); // Re-init if config changes (unlikely)

    const openWidget = () => {
        if (!name.trim()) {
            setErrorMessage("请先输入名字！(Please enter your name first)");
            return;
        }
        setErrorMessage('');

        if (!widgetRef.current) {
            if (!window.cloudinary) {
                setErrorMessage("Widget script not loaded. Please refresh.");
            } else {
                setErrorMessage("Widget initializing... please click again.");
            }
            return;
        }

        widgetRef.current.open();
    };

    const handleGoogleSheetSubmit = async (runnerName: string, videoUrl: string) => {
        setStatus('submitting_sheet');

        const scriptPayload = {
            name: runnerName,
            url: videoUrl,
            timestamp: new Date().toLocaleString()
        };

        console.log("Sending to Google Sheet:", scriptPayload);

        try {
            await fetch(googleScriptUrl, {
                method: 'POST',
                mode: 'no-cors', 
                headers: {
                    'Content-Type': 'text/plain' 
                },
                body: JSON.stringify(scriptPayload)
            });
            console.log("Google Sheet request sent.");
            
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
                <p className="text-slate-400 text-sm mb-6">Upload your workout video (Max 550MB).</p>

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

                                <div className="pt-2">
                                    <button 
                                        onClick={openWidget}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
                                    >
                                        <Video size={20} />
                                        📹 上传视频
                                    </button>
                                    <p className="text-center text-xs text-slate-500 mt-3">
                                        Supports large videos. We'll speed it up 2x automatically!
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