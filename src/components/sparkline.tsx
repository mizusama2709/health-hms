const WIDTH = 96;
const HEIGHT = 28;
const PAD = 2;

/**
 * A minimal inline trend line for stat tiles — no axes, no hover, no
 * labels, just shape. For anything that needs an exact value per point,
 * use LabTrendChart/RevenueTrendChart instead; this is deliberately just a
 * glance-level "up or down" indicator.
 */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (WIDTH - PAD * 2),
    y: HEIGHT - PAD - ((v - min) / span) * (HEIGHT - PAD * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT} L ${points[0].x} ${HEIGHT} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={className} aria-hidden="true">
      <path d={areaPath} className="fill-current opacity-10" />
      <path d={linePath} fill="none" className="stroke-current" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={2} className="fill-current" />
    </svg>
  );
}

export { Sparkline };
