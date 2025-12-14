import React, { useEffect, useRef, useState } from 'react';

type EffectType = 'snow' | 'fireworks';

export const BackgroundEffects: React.FC = () => {
    const [effect, setEffect] = useState<EffectType>('snow');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Date Logic to switch effects
    useEffect(() => {
        const checkDate = () => {
            const today = new Date();
            const year = today.getFullYear();
            
            // Approximate CNY windows (Lunar New Year +/- 15 days)
            // 2025 CNY: Jan 29. Window: Jan 15 - Feb 15
            // 2026 CNY: Feb 17. Window: Feb 1 - Mar 1
            
            const isCNY2025 = year === 2025 && (today.getMonth() === 0 && today.getDate() >= 15) || (today.getMonth() === 1 && today.getDate() <= 15);
            const isCNY2026 = year === 2026 && (today.getMonth() === 1 || (today.getMonth() === 2 && today.getDate() <= 3));

            if (isCNY2025 || isCNY2026) {
                setEffect('fireworks');
            } else {
                setEffect('snow');
            }
        };
        checkDate();
    }, []);

    // --- SNOW EFFECT RENDERER (Updated to use ❄️) ---
    const renderSnow = () => {
        // Create 40 snowflakes
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(40)].map((_, i) => {
                    const left = Math.random() * 100;
                    const animDelay = Math.random() * 5;
                    const animDuration = 8 + Math.random() * 10; // Slower fall
                    const size = 12 + Math.random() * 14; // Bigger icons
                    const opacity = 0.2 + Math.random() * 0.5;
                    
                    return (
                        <div 
                            key={i}
                            className="absolute text-white select-none"
                            style={{
                                left: `${left}%`,
                                top: `-30px`,
                                fontSize: `${size}px`,
                                opacity: opacity,
                                animation: `snowFall ${animDuration}s linear infinite`,
                                animationDelay: `-${animDelay}s`,
                                textShadow: '0 0 5px rgba(255,255,255,0.4)'
                            }}
                        >
                            ❄️
                        </div>
                    );
                })}
                <style>{`
                    @keyframes snowFall {
                        0% { 
                            transform: translateY(-5vh) translateX(0) rotate(0deg); 
                        }
                        25% {
                            transform: translateY(25vh) translateX(15px) rotate(90deg);
                        }
                        50% {
                            transform: translateY(50vh) translateX(-15px) rotate(180deg);
                        }
                        75% {
                            transform: translateY(75vh) translateX(15px) rotate(270deg);
                        }
                        100% { 
                            transform: translateY(110vh) translateX(0) rotate(360deg); 
                        }
                    }
                `}</style>
            </div>
        );
    };

    // --- FIREWORKS & FIRECRACKER EFFECT RENDERER ---
    useEffect(() => {
        if (effect !== 'fireworks' || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const particles: Particle[] = [];
        const rockets: Rocket[] = [];
        const firecrackers: Firecracker[] = [];
        
        // Limited Festive Colors (Red, Gold, Orange, White)
        const colors = [
            '#FF0000', // Red
            '#FFD700', // Gold
            '#FF4500', // Orange Red
            '#FFFFFF', // White
            '#FFFF00', // Yellow
        ];

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            alpha: number;
            color: string;
            decay: number;

            constructor(x: number, y: number, color: string, speedMult: number = 1, decay: number = 0.01) {
                this.x = x;
                this.y = y;
                const angle = Math.random() * Math.PI * 2;
                const speed = (Math.random() * 3 + 1) * speedMult;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.alpha = 1;
                this.color = color;
                this.decay = decay;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.05; // gravity
                this.alpha -= this.decay;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.globalAlpha = Math.max(0, this.alpha);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        class Rocket {
            x: number;
            y: number;
            vy: number;
            color: string;
            exploded: boolean;

            constructor() {
                this.x = Math.random() * width;
                this.y = height;
                this.vy = -(Math.random() * 5 + 12);
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.exploded = false;
            }

            update() {
                this.y += this.vy;
                this.vy += 0.2; // gravity drag
                if (this.vy >= -1) { // Explode near peak
                    this.exploded = true;
                    // Create explosion
                    for (let i = 0; i < 60; i++) {
                        particles.push(new Particle(this.x, this.y, this.color));
                    }
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                ctx.fill();
                // Trail
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x, this.y + 15);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Simulates a string of firecrackers hanging/falling
        class Firecracker {
            x: number;
            y: number;
            duration: number;
            timer: number;
            finished: boolean;

            constructor() {
                this.x = Math.random() * (width * 0.8) + (width * 0.1); // Keep away from extreme edges
                this.y = Math.random() * (height * 0.5); // Start in upper half
                this.duration = 40 + Math.random() * 40; // Frames to last
                this.timer = 0;
                this.finished = false;
            }

            update() {
                this.timer++;
                this.y += 2; // Falls slowly

                // Rapid popping effect
                if (this.timer % 3 === 0) {
                    // Flash
                    const color = Math.random() > 0.5 ? '#FF0000' : '#FFD700';
                    // Debris particles (faster, shorter life)
                    for(let i=0; i<5; i++) {
                        particles.push(new Particle(this.x, this.y, color, 1.5, 0.05));
                    }
                }

                if (this.timer >= this.duration) {
                    this.finished = true;
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                // Draw the "string"
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#8B0000'; // Dark red string
                ctx.fillRect(this.x, this.y - 20, 2, 20);
                
                // Draw the pop flash
                if (this.timer % 3 === 0) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        const loop = () => {
            if (!ctx) return;
            // Clear with trail effect
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Slightly longer trails
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            // 1. Randomly launch Rockets (Fireworks)
            if (Math.random() < 0.02) {
                rockets.push(new Rocket());
            }

            // 2. Randomly spawn Firecrackers (Lower chance)
            if (Math.random() < 0.008) {
                firecrackers.push(new Firecracker());
            }

            // Update Rockets
            for (let i = rockets.length - 1; i >= 0; i--) {
                rockets[i].update();
                rockets[i].draw(ctx);
                if (rockets[i].exploded) {
                    rockets.splice(i, 1);
                }
            }

            // Update Firecrackers
            for (let i = firecrackers.length - 1; i >= 0; i--) {
                firecrackers[i].update();
                firecrackers[i].draw(ctx);
                if (firecrackers[i].finished) {
                    firecrackers.splice(i, 1);
                }
            }

            // Update Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw(ctx);
                if (particles[i].alpha <= 0) {
                    particles.splice(i, 1);
                }
            }

            requestAnimationFrame(loop);
        };

        const animationId = requestAnimationFrame(loop);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, [effect]);

    return (
        <>
            <div className="fixed inset-0 bg-slate-900 -z-20"></div>
            {/* Base Gradient */}
            <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 -z-20"></div>
            
            {effect === 'snow' && renderSnow()}
            
            {effect === 'fireworks' && (
                 <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
            )}
        </>
    );
};