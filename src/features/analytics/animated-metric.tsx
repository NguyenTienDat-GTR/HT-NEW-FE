"use client";

import { ChartLineUp } from "@phosphor-icons/react";
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
      className="rounded-[16px] border border-border bg-white p-5 shadow-[var(--shadow-card)]"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-primary/10 text-primary">
          <ChartLineUp className="h-5 w-5" weight="bold" />
        </span>
      </div>
      <p aria-hidden className="mt-3 text-3xl font-semibold tracking-[0] text-foreground">
        {visibleValue}
      </p>
      <p className="mt-2 text-sm font-semibold text-success">▲ 8,5% <span className="font-normal text-muted">so với kỳ trước</span></p>
    </motion.div>
  );
}
