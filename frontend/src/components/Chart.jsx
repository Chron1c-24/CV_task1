/*
 * Small SVG chart for 256-value curves (histogram, PDF, CDF).
 * x = gray level 0-255, y = value in `unit`. mode "bar" draws series[0] as bars, "line" draws every series.
 */
const W = 320;
const H = 180;
const PAD = { left: 46, right: 8, top: 10, bottom: 30 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const formatValue = (v) => (v >= 1 ? Math.round(v).toLocaleString() : v.toFixed(3));

export default function Chart({ title, unit, mode, series }) {
  const count = series[0].values.length;
  const max = Math.max(...series.flatMap((s) => s.values)) || 1;
  const x = (i) => PAD.left + (i * PLOT_W) / count;
  const y = (v) => PAD.top + PLOT_H * (1 - v / max);
  const barWidth = PLOT_W / count;

  return (
    <figure className="card chart">
      <figcaption>
        {title} <small>({unit})</small>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={W - PAD.right} y2={PAD.top + PLOT_H} className="axis" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PLOT_H} className="axis" />

        {mode === "bar"
          ? series[0].values.map((v, i) => (
              <rect key={i} x={x(i)} y={y(v)} width={barWidth} height={PAD.top + PLOT_H - y(v)} fill={series[0].color} />
            ))
          : series.map((s) => (
              <polyline
                key={s.label ?? s.path}
                points={s.values.map((v, i) => `${x(i) + barWidth / 2},${y(v)}`).join(" ")}
                fill="none" stroke={s.color} strokeWidth="1.5"
              />
            ))}

        <text x={PAD.left - 4} y={PAD.top + 4} className="tick" textAnchor="end">{formatValue(max)}</text>
        <text x={PAD.left - 4} y={PAD.top + PLOT_H} className="tick" textAnchor="end">0</text>
        <text x={PAD.left} y={H - 14} className="tick" textAnchor="middle">0</text>
        <text x={W - PAD.right} y={H - 14} className="tick" textAnchor="end">{count - 1}</text>
        <text x={PAD.left + PLOT_W / 2} y={H - 4} className="tick" textAnchor="middle">gray level</text>
      </svg>
      {series.length > 1 && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      )}
    </figure>
  );
}
