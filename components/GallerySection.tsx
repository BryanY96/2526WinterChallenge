import React, { useState, useRef } from 'react';
import { Film, Play } from 'lucide-react';

export interface GalleryItem {
    name: string;
    url: string;
    timestamp?: string;
}

interface GallerySectionProps {
    items: GalleryItem[];
}

const MediaItem: React.FC<{ item: GalleryItem, index: number, className?: string }> = ({ item, index, className }) => {
    // Detect WeChat browser
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    
    // Basic check: if URL contains video indicators, treat as video
    // The new uploader adds 'f_auto' or 'f_mp4', which might return mp4/webm.
    // We assume anything with 'f_auto' or 'f_mp4' from the new uploader is a video loop.
    const isVideo = item.url.includes('.mp4') || 
                    item.url.includes('.mov') || 
                    item.url.includes('.webm') || 
                    item.url.includes('f_auto') || 
                    item.url.includes('f_mp4') ||
                    item.url.includes('e_accelerate');
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Auto-play for non-WeChat browsers, manual play for WeChat
    const shouldAutoPlay = !isWeChat;
    
    // Ensure MP4 format for WeChat compatibility
    // Remove any problematic transformations
    let videoUrl = item.url;
    if (isVideo) {
        // Force MP4 format
        if (videoUrl.includes('f_auto')) {
            videoUrl = videoUrl.replace('f_auto', 'f_mp4');
        }
        // Remove e_accelerate which may cause issues
        videoUrl = videoUrl.replace(/e_accelerate[^\/]*/g, '');
        // Ensure we have f_mp4 if it's a video
        if (!videoUrl.includes('f_mp4') && !videoUrl.includes('.mp4')) {
            // Insert f_mp4 before the path
            videoUrl = videoUrl.replace('/upload/', '/upload/f_mp4,q_auto,');
        }
    }
    
    // Generate poster image from video URL (Cloudinary thumbnail)
    // Use a simpler transformation for better compatibility
    const posterUrl = isVideo 
        ? videoUrl.replace('/upload/', '/upload/w_400,h_500,c_fill,f_jpg,q_auto/').replace(/f_mp4[^\/]*/g, '')
        : undefined;

    const handleVideoClick = () => {
        if (!videoRef.current) return;
        
        if (hasError) {
            // If error, try to reload
            setHasError(false);
            setErrorMessage('');
            setIsLoading(true);
            videoRef.current.load();
            return;
        }
        
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play().catch(err => {
                console.error('Video play error:', err);
                setHasError(true);
                setErrorMessage('无法播放视频，请检查网络连接');
            });
            setIsPlaying(true);
        }
    };

    const handleVideoLoadStart = () => {
        setIsLoading(true);
        setHasError(false);
    };

    const handleVideoCanPlay = () => {
        setIsLoading(false);
        setHasError(false);
        
        // Auto-play for non-WeChat browsers
        if (shouldAutoPlay && videoRef.current && !isPlaying) {
            videoRef.current.play().catch(err => {
                // Auto-play may fail due to browser policy, that's okay
                console.log('Auto-play prevented by browser:', err);
            });
        }
    };

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        console.error('Video error:', e);
        setIsLoading(false);
        setHasError(true);
        const video = e.currentTarget;
        const error = video.error;
        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    setErrorMessage('视频加载被中止');
                    break;
                case error.MEDIA_ERR_NETWORK:
                    setErrorMessage('网络错误，无法加载视频');
                    break;
                case error.MEDIA_ERR_DECODE:
                    setErrorMessage('视频格式不支持');
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    setErrorMessage('视频源不支持');
                    break;
                default:
                    setErrorMessage('视频加载失败');
            }
        } else {
            setErrorMessage('视频无法播放');
        }
    };

    return (
        <div className={`group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 hover:border-amber-500/50 transition-colors ${className}`}>
            {isVideo ? (
                <>
                    {/* Poster/Thumbnail - Always show as fallback */}
                    {posterUrl && (
                        <img 
                            src={posterUrl}
                            alt={`${item.name}'s workout thumbnail`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                                isPlaying && !hasError ? 'opacity-0' : 'opacity-100'
                            }`}
                        />
                    )}
                    
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className={`w-full h-full object-cover transition-opacity ${
                            isPlaying && !hasError ? 'opacity-100' : 'opacity-0'
                        }`}
                        loop
                        muted
                        playsInline
                        controls={false}
                        preload="metadata"
                        autoPlay={shouldAutoPlay}
                        onClick={handleVideoClick}
                        onLoadStart={handleVideoLoadStart}
                        onCanPlay={handleVideoCanPlay}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onError={handleVideoError}
                    />
                    
                    {/* Loading indicator */}
                    {isLoading && !hasError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="text-white text-sm">加载中...</div>
                        </div>
                    )}
                    
                    {/* Error message */}
                    {hasError && (
                        <div 
                            className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 cursor-pointer"
                            onClick={handleVideoClick}
                        >
                            <div className="text-red-400 text-sm mb-2 text-center px-4">
                                {errorMessage || '视频加载失败'}
                            </div>
                            <div className="text-white text-xs opacity-70">点击重试</div>
                        </div>
                    )}
                    
                    {/* Play button overlay - only show in WeChat or when video is paused */}
                    {(!isPlaying && !hasError && !isLoading) && (isWeChat || !shouldAutoPlay) && (
                        <div 
                            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity group-hover:bg-black/20 z-10"
                            onClick={handleVideoClick}
                        >
                            <div className="bg-black/70 rounded-full p-4 backdrop-blur-sm">
                                <Play size={32} className="text-white fill-white" />
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <img 
                    src={item.url} 
                    alt={`${item.name}'s workout`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
            )}
            
            {/* Overlay info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black uppercase">
                        {item.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium truncate">{item.name}</span>
                </div>
            </div>
            
            {/* Type Indicator */}
            {isVideo && (
                <div className="absolute top-2 right-2 bg-black/40 backdrop-blur rounded-full p-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Play size={12} fill="white" className="text-white" />
                </div>
            )}
        </div>
    );
};

export const GallerySection: React.FC<GallerySectionProps> = ({ items }) => {
    return (
        <section className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-2 mb-6">
                <Film className="text-amber-500" size={24} />
                <h3 className="text-xl font-bold text-white">高光时刻 (Highlight Moments)</h3>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full ml-auto">
                    {items.length} Posts
                </span>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/30">
                    <Film size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-500">No uploads yet. Be the first to check in!</p>
                </div>
            ) : (
                <div className="relative">
                    {/* 
                      DESKTOP LAYOUT (Hidden on mobile) 
                      Single row, large cards.
                    */}
                    <div className="hidden md:flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {items.map((item, idx) => (
                            <div 
                                key={`d-${idx}-${item.name}`} 
                                className="flex-shrink-0 w-56 aspect-[4/5] snap-start"
                            >
                                <MediaItem item={item} index={idx} className="w-full h-full" />
                            </div>
                        ))}
                    </div>

                    {/* 
                      MOBILE LAYOUT (Hidden on desktop)
                      Grid with 2 rows and horizontal scrolling (grid-flow-col).
                      Constraint: Container height must be defined for grid-rows to work.
                      Height calculation: 2 rows of ~160px-200px cards + gap.
                      We use h-[400px] to fit two nice vertical video cards.
                    */}
                    <div className="md:hidden grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto snap-x snap-mandatory pb-4 h-[420px] auto-cols-[45%] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                         {items.map((item, idx) => (
                            <div 
                                key={`m-${idx}-${item.name}`} 
                                className="snap-start relative w-full h-full"
                            >
                                <MediaItem item={item} index={idx} className="w-full h-full absolute inset-0" />
                            </div>
                        ))}
                    </div>
                    
                    {/* Fade overlay for scroll hint */}
                    <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-slate-800 to-transparent pointer-events-none" />
                </div>
            )}
        </section>
    );
};