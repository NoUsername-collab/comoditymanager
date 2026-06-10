"use client";

import { useEffect, useRef, useState } from "react";
import {
  createLiquidShader,
  themeLiquidColors,
  type LiquidShaderHandle,
} from "@/lib/admin-liquid-shader";

type Props = {
  className?: string;
  /** Intensitate vizuală shader (0–1). */
  intensity?: number;
};

export function AdminLiquidShader({ className = "", intensity = 0.78 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<LiquidShaderHandle | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    handleRef.current?.setIntensity(intensity);
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    if (document.documentElement.getAttribute("data-admin-retro")) return;

    const handle = createLiquidShader(canvas);
    if (!handle) return;

    handleRef.current = handle;
    handle.setColors(themeLiquidColors());
    handle.setIntensity(intensity);
    setActive(true);

    const syncColors = () => handle.setColors(themeLiquidColors());
    const ro = new ResizeObserver(() => handle.resize());
    ro.observe(canvas);

    const mo = new MutationObserver(syncColors);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-mode", "style"],
    });

    window.addEventListener("admin-theme-change", syncColors);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("admin-theme-change", syncColors);
      handle.destroy();
      handleRef.current = null;
      setActive(false);
    };
  }, [intensity]);

  return (
    <div
      className={[
        "admin-liquid-shader",
        active && "admin-liquid-shader--active",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <canvas ref={canvasRef} className="admin-liquid-shader__canvas" />
    </div>
  );
}
