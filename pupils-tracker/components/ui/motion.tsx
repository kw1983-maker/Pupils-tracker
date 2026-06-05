"use client";

import { motion, AnimatePresence, useReducedMotion, type Variants } from "motion/react";
import { ReactNode } from "react";

// Soft "paper settling" entrance — fade + 8px rise, easing matches --ease-out-paper.
const EASE = [0.16, 1, 0.3, 1] as const;

/** Staggered container — children should be <StaggerItem>. */
export function Stagger({
  children,
  className,
  stagger = 0.06,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger } },
  };
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

/** A single staggered child. Drops the y-transform under reduced-motion. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
      };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

/** Cross-fade + rise when swapping the active panel (keyed by id). */
export function PanelSwap({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
