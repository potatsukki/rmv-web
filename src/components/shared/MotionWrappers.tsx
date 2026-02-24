import { motion } from 'framer-motion';
import { memo, ReactNode } from 'react';

interface MotionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
}

/*
 * Silky-smooth 120 / 144 Hz motion wrappers.
 *
 * Principles applied:
 *  1. All animations target ONLY compositor-friendly properties
 *     (opacity + transform).  Framer Motion's x / y / scale are all
 *     translated to GPU-composited transforms under the hood.
 *  2. `willChange: 'transform, opacity'` tells the browser to promote
 *     the element to its own GPU layer BEFORE the animation starts,
 *     eliminating first-frame jank on high-refresh displays.
 *  3. Easing uses a custom cubic-bezier curve that decelerates more
 *     gradually than `easeOut`, producing visibly smoother motion
 *     at 120 Hz+ where individual frames are more perceptible.
 *  4. `whileInView` batches IntersectionObservers internally.
 *  5. React.memo prevents reconciliation from parent re-renders.
 */

/** Smooth deceleration curve — feels natural at ≥120 fps */
const SMOOTH_EASE = [0.25, 0.1, 0.25, 1.0] as const;

/** Shared GPU-promotion hint applied to every animated wrapper */
const GPU_STYLE = { willChange: 'transform, opacity' as const };

export const FadeIn = memo(function FadeIn({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  once = true,
}: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once }}
      transition={{ duration, delay, ease: SMOOTH_EASE }}
      style={GPU_STYLE}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const SlideUp = memo(function SlideUp({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  once = true,
}: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-50px' }}
      transition={{ duration, delay, ease: SMOOTH_EASE }}
      style={GPU_STYLE}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const SlideInLeft = memo(function SlideInLeft({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  once = true,
}: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once, margin: '-50px' }}
      transition={{ duration, delay, ease: SMOOTH_EASE }}
      style={GPU_STYLE}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const SlideInRight = memo(function SlideInRight({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  once = true,
}: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once, margin: '-50px' }}
      transition={{ duration, delay, ease: SMOOTH_EASE }}
      style={GPU_STYLE}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const ScaleIn = memo(function ScaleIn({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  once = true,
}: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once }}
      transition={{ duration, delay, ease: SMOOTH_EASE }}
      style={GPU_STYLE}
      className={className}
    >
      {children}
    </motion.div>
  );
});

interface StaggerProps extends MotionProps {
  staggerDelay?: number;
}

export const StaggerContainer = memo(function StaggerContainer({
  children,
  className = '',
  delay = 0,
  staggerDelay = 0.1,
  once = true,
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-50px' }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: SMOOTH_EASE },
  },
};
