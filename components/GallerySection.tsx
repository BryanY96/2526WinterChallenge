import React from 'react';
import { Film, Play } from 'lucide-react';

export interface GalleryItem {
    name: string;
    url: string;
    timestamp?: string;
}

interface GallerySectionProps {
    items: GalleryItem[];
}

const MediaItem: React.FC<{ item: GalleryItem }> = ({ item }) => {
    // Basic check: if URL contains video indicators, treat as video
    // The new uploader adds 'f_auto' or 'e_accelerate', which might return mp4/webm.
    // We assume anything with 'f_auto' from the new uploader is a video loop.
    const isVideo = item.url.includes('.mp4') || 
                    item.url.includes('.mov') || 
                    item.url.includes('.webm') || 
                    item.url.includes('f_auto') || 
                    item.url.includes('e_accelerate');

    return (
        <div className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-[4/5] border border-slate-700 hover:border-amber-500/50 transition-colors">
            {isVideo ? (
                <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster="https://via.placeholder.com/320x400/1e293b/cbd5e1?text=Loading..."
                />
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
                    {/* 1. flex: 让子元素横向排列 
                        2. overflow-x-auto: 允许水平滚动
                        3. snap-x: 开启滚动吸附效果，手感更好
                        4. pb-4: 底部留一点空间防止滚动条挡住内容
                        5. no-scrollbar: 下面的 style 或者是 Tailwind 插件用来隐藏丑陋的滚动条
                    */}
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {items.map((item, idx) => (
                            // 必须给每个 Item 一个固定的宽度 (min-w) 并且防止被压缩 (flex-shrink-0)
                            <div 
                                key={`${idx}-${item.name}`} 
                                className="flex-shrink-0 w-40 md:w-56 snap-start"
                            >
                                <MediaItem item={item} />
                            </div>
                        ))}
                    </div>
                    
                    {/* (可选) 视觉提示：右侧渐变遮罩，提示用户还可以往右滑 */}
                    <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-slate-800 to-transparent pointer-events-none" />
                </div>
            )}
        </section>
    );
};
