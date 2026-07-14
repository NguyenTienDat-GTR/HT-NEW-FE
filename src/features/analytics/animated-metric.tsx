"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { viNumber } from "@/lib/utils";

type AnimatedMetricProps = {
  label: string;
  value: number;
  delay?: number;
};

export function AnimatedMetric({ label, value, delay = 0 }: AnimatedMetricProps) {
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(reducedMotion ? value : 0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 24, mass: 0.8 });
  const text = useTransform(spring, (latest) => viNumber.format(Math.round(latest)));
  const [display, setDisplay] = useState(viNumber.format(value));
  const visibleValue = reducedMotion ? viNumber.format(value) : display;

  useEffect(() => {
    if (reducedMotion) {
      motionValue.set(value);
      return;
    }
    motionValue.set(value);
    const unsubscribe = text.on("change", (latest) => setDisplay(latest));
    const timer = window.setTimeout(() => setDisplay(viNumber.format(value)), 760);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [motionValue, reducedMotion, text, value]);

  return (
    <motion.div
      aria-label={`${label}: ${viNumber.format(value)}`}
      className="rounded-[12px] border border-border bg-white p-4 shadow-[var(--shadow-card)]"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22, ease: "easeOut" }}
    >
      <p className="text-sm font-medium text-muted">{label}</p>
      <p aria-hidden className="mt-3 text-3xl font-semibold tracking-[0] text-foreground">
        {visibleValue}
      </p>
    </motion.div>
  );
}
