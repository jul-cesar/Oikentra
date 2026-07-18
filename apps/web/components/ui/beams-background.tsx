"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedGradientBackgroundProps {
    className?: string;
    children?: React.ReactNode;
    intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
    x: number;
    y: number;
    width: number;
    length: number;
    angle: number;
    speed: number;
    opacity: number;
    hue: number;
    pulse: number;
    pulseSpeed: number;
}

const opacityMap = {
    subtle: 0.7,
    medium: 0.85,
    strong: 1,
};

function createBeam(width: number, height: number): Beam {
    return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 30 + Math.random() * 60,
        length: height * 2.5,
        angle: -35 + Math.random() * 10,
        speed: 0.6 + Math.random() * 1.2,
        opacity: 0.12 + Math.random() * 0.16,
        hue: 148 + Math.random() * 28,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
    };
}

export function BeamsBackground({
    className,
    intensity = "strong",
    children,
}: AnimatedGradientBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const beamsRef = useRef<Beam[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;
        const canvas = canvasElement;

        const context = canvas.getContext("2d");
        if (!context) return;
        const ctx = context;

        const isLowPower = window.innerWidth <= 768 || (navigator.hardwareConcurrency || 8) <= 4;
        const renderScale = Math.min(window.devicePixelRatio || 1, isLowPower ? 1 : 1.5) * (isLowPower ? 0.8 : 1);
        const frameInterval = isLowPower ? 1000 / 30 : 1000 / 45;
        let viewportWidth = 0;
        let viewportHeight = 0;
        let isVisible = true;
        let lastFrame = 0;

        function updateCanvasSize() {
            viewportWidth = window.innerWidth;
            viewportHeight = window.innerHeight;
            canvas.width = Math.max(1, Math.floor(viewportWidth * renderScale));
            canvas.height = Math.max(1, Math.floor(viewportHeight * renderScale));
            canvas.style.width = `${viewportWidth}px`;
            canvas.style.height = `${viewportHeight}px`;
            ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

            const baseBeamCount = intensity === "subtle" ? 12 : intensity === "medium" ? 16 : 20;
            const totalBeams = isLowPower ? Math.max(10, baseBeamCount - 4) : baseBeamCount;
            beamsRef.current = Array.from({ length: totalBeams }, () =>
                createBeam(viewportWidth, viewportHeight),
            );
            if (beamsRef.current.length > 0 && reducedMotion === true) draw();
        }

        function resetBeam(beam: Beam, index: number, totalBeams: number) {
            const column = index % 3;
            const spacing = viewportWidth / 3;

            beam.y = viewportHeight + 100;
            beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
            beam.width = 100 + Math.random() * 100;
            beam.speed = 0.5 + Math.random() * 0.4;
            beam.hue = 148 + (index * 28) / totalBeams;
            beam.opacity = 0.2 + Math.random() * 0.1;
        }

        function drawBeam(beam: Beam) {
            ctx.save();
            ctx.translate(beam.x, beam.y);
            ctx.rotate((beam.angle * Math.PI) / 180);

            const pulsingOpacity = beam.opacity *
                (0.8 + Math.sin(beam.pulse) * 0.2) * opacityMap[intensity];
            const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
            gradient.addColorStop(0, `hsla(${beam.hue}, 58%, 58%, 0)`);
            gradient.addColorStop(0.1, `hsla(${beam.hue}, 58%, 58%, ${pulsingOpacity * 0.5})`);
            gradient.addColorStop(0.4, `hsla(${beam.hue}, 58%, 58%, ${pulsingOpacity})`);
            gradient.addColorStop(0.6, `hsla(${beam.hue}, 58%, 58%, ${pulsingOpacity})`);
            gradient.addColorStop(0.9, `hsla(${beam.hue}, 58%, 58%, ${pulsingOpacity * 0.5})`);
            gradient.addColorStop(1, `hsla(${beam.hue}, 58%, 58%, 0)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
            ctx.restore();
        }

        function scheduleFrame() {
            if (reducedMotion === true || !isVisible || animationFrameRef.current !== null) return;
            animationFrameRef.current = requestAnimationFrame((timestamp) => {
                animationFrameRef.current = null;
                if (timestamp - lastFrame < frameInterval) {
                    scheduleFrame();
                    return;
                }
                lastFrame = timestamp;
                draw();
            });
        }

        function draw() {
            ctx.clearRect(0, 0, viewportWidth, viewportHeight);
            ctx.filter = isLowPower ? "blur(24px)" : "blur(35px)";

            const totalBeams = beamsRef.current.length;
            beamsRef.current.forEach((beam, index) => {
                if (reducedMotion !== true) {
                    beam.y -= beam.speed;
                    beam.pulse += beam.pulseSpeed;
                    if (beam.y + beam.length < -100) resetBeam(beam, index, totalBeams);
                }
                drawBeam(beam);
            });

            ctx.filter = "none";
            scheduleFrame();
        }

        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);

        const visibilityObserver = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible) draw();
        });
        visibilityObserver.observe(canvas);

        const handleVisibilityChange = () => {
            isVisible = !document.hidden;
            if (isVisible) draw();
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        draw();

        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            visibilityObserver.disconnect();
            if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [intensity, reducedMotion]);

    return (
        <div className={cn("relative min-h-svh w-full overflow-hidden bg-background", className)}>
            <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0"
                style={{ filter: "blur(8px)" }}
            />

            <motion.div
                className="pointer-events-none absolute inset-0 bg-background/5"
                animate={reducedMotion ? undefined : { opacity: [0.05, 0.15, 0.05] }}
                transition={reducedMotion ? undefined : {
                    duration: 10,
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                }}
                style={{ backdropFilter: reducedMotion ? "blur(18px)" : "blur(30px)" }}
            />

            <div className="relative z-10 flex min-h-svh w-full items-center justify-center">
                {children}
            </div>
        </div>
    );
}
