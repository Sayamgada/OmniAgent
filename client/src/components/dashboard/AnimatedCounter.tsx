import { useEffect, useState } from "react";

type AnimatedCounterProps = {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
};

export function AnimatedCounter({
  value,
  duration = 1200,
  decimals = 0,
  suffix = "",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString();

  return (
    <span>
      {formatted}
      {suffix}
    </span>
  );
}
