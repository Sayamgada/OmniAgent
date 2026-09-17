export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Precision ambient atmospheric gradients */}
      <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/6 blur-[160px]" />
      <div className="absolute top-1/3 -right-20 h-[450px] w-[450px] rounded-full bg-accent/5 blur-[140px]" />
      <div className="absolute -bottom-20 left-1/3 h-[400px] w-[400px] rounded-full bg-secondary/4 blur-[140px]" />

      {/* Subtle technical mesh grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
        }}
      />
    </div>
  );
}
