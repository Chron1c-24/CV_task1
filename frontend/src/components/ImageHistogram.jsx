import { useEffect, useMemo, useRef, useState } from "react";
import { computeHistogramFromSrc, computeStatDelta } from "../utils/histogram.js";
import { niceTicks, useXZoom } from "../utils/useXZoom.js";

const W = 320;
const H = 120;
const PAD = { left: 34, right: 10, top: 14, bottom: 22 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const formatCount = (v) => {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return Math.round(v).toString();
};

const formatDelta = (val, decimals = 1) => {
  if (val === null || val === undefined) return null;
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(decimals)}`;
};

export default function ImageHistogram({
  src,
  baselineData = null,
  onDataLoaded = null,
  compact = false,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channel, setChannel] = useState("auto"); // auto, gray, rgb, r, g, b
  const [showCdf, setShowCdf] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [overlayBaseline, setOverlayBaseline] = useState(false);
  const [hoverBin, setHoverBin] = useState(null);
  const zoom = useXZoom({ fullMax: 255, plotLeft: PAD.left, plotW: PLOT_W, viewW: W });
  const { svgRef, lo, hi } = zoom;

  const loadHistogram = () => {
    if (!src) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    computeHistogramFromSrc(src)
      .then((res) => {
        if (res) {
          setData(res);
          setError(null);
          onDataLoaded?.(res);
        } else {
          setError("Histogram could not be generated");
        }
      })
      .catch((err) => {
        console.error("Failed to compute histogram:", err);
        setError("Error generating histogram");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadHistogram();
  }, [src]);

  // Determine active channel mode
  const activeChannel = useMemo(() => {
    if (!data) return "gray";
    if (channel === "auto") {
      return data.isGrayscale ? "gray" : "rgb";
    }
    return channel;
  }, [data, channel]);

  // Compute maximum bin value for scaling Y axis
  const maxBin = useMemo(() => {
    if (!data) return 1;
    const from = Math.max(0, Math.floor(lo));
    const to = Math.min(255, Math.ceil(hi)) + 1;
    const peak = (arr) => Math.max(...Array.from(arr).slice(from, to), 1);
    if (activeChannel === "rgb") {
      return Math.max(peak(data.channels.r), peak(data.channels.g), peak(data.channels.b));
    }
    return peak(data.channels[activeChannel] || data.channels.gray);
  }, [data, activeChannel, lo, hi]);


  // Scaling helpers
  const getX = (bin) => PAD.left + ((bin - lo) / (hi - lo)) * PLOT_W;
  const getY = (val) => PAD.top + PLOT_H * (1 - Math.min(val, maxBin) / maxBin);

  // Generate SVG path for a 256-bin series
  const createPath = (series) => {
    if (!series || series.length === 0) return "";
    let d = `M ${getX(0)} ${getY(series[0])}`;
    for (let i = 1; i < 256; i++) {
      d += ` L ${getX(i)} ${getY(series[i])}`;
    }
    return d;
  };

  const createAreaPath = (series) => {
    if (!series || series.length === 0) return "";
    let d = `M ${getX(0)} ${PAD.top + PLOT_H} L ${getX(0)} ${getY(series[0])}`;
    for (let i = 1; i < 256; i++) {
      d += ` L ${getX(i)} ${getY(series[i])}`;
    }
    d += ` L ${getX(255)} ${PAD.top + PLOT_H} Z`;
    return d;
  };

  // Mouse interaction for tooltip
  const handleMouseMove = (e) => {
    if (zoom.dragMove(e)) return; // panning
    const bin = Math.round(zoom.binAt(e.clientX));
    if (bin >= 0 && bin <= 255 && bin >= lo && bin <= hi) {
      setHoverBin(bin);
    } else {
      setHoverBin(null);
    }
  };

  const handleMouseLeave = () => {
    zoom.endDrag();
    setHoverBin(null);
  };

  const deltas = useMemo(() => {
    if (!data?.stats || !baselineData?.stats) return null;
    return computeStatDelta(data.stats, baselineData.stats);
  }, [data, baselineData]);

  if (!src) return null;

  if (loading) {
    return (
      <div className="hist-skeleton">
        <span className="muted">Computing histogram…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="hist-error-box">
        <span className="muted">{error || "Histogram unavailable"}</span>
        <button type="button" className="hist-btn-opt" onClick={loadHistogram}>
          Retry
        </button>
      </div>
    );
  }

  const { stats, isGrayscale, channels, cdf, pdf, totalPixels } = data;

  return (
    <div className={`hist-card ${compact ? "compact" : ""}`}>
      {/* Controls Bar */}
      <div className="hist-toolbar">
        <div className="hist-channels">
          {isGrayscale ? (
            <span className="hist-badge gray">Grayscale</span>
          ) : (
            <>
              <button
                type="button"
                className={`hist-btn-tab ${activeChannel === "rgb" ? "active" : ""}`}
                onClick={() => setChannel("rgb")}
                title="RGB Composite Overlay"
              >
                RGB
              </button>
              <button
                type="button"
                className={`hist-btn-tab ${activeChannel === "gray" ? "active" : ""}`}
                onClick={() => setChannel("gray")}
                title="Luminance (Gray)"
              >
                Gray
              </button>
              <button
                type="button"
                className={`hist-btn-tab r-tab ${activeChannel === "r" ? "active" : ""}`}
                onClick={() => setChannel("r")}
              >
                R
              </button>
              <button
                type="button"
                className={`hist-btn-tab g-tab ${activeChannel === "g" ? "active" : ""}`}
                onClick={() => setChannel("g")}
              >
                G
              </button>
              <button
                type="button"
                className={`hist-btn-tab b-tab ${activeChannel === "b" ? "active" : ""}`}
                onClick={() => setChannel("b")}
              >
                B
              </button>
            </>
          )}
        </div>

        <div className="hist-options">
          <button
            type="button"
            className={`hist-btn-opt ${showPdf ? "active" : ""}`}
            onClick={() => setShowPdf((v) => !v)}
            title="Probability Density Function (PDF curve)"
          >
            PDF
          </button>
          <button
            type="button"
            className={`hist-btn-opt ${showCdf ? "active" : ""}`}
            onClick={() => setShowCdf((v) => !v)}
            title="Cumulative Distribution Function (CDF 0-100%)"
          >
            CDF
          </button>
          {baselineData && (
            <button
              type="button"
              className={`hist-btn-opt ${overlayBaseline ? "active" : ""}`}
              onClick={() => setOverlayBaseline((v) => !v)}
              title="Overlay the Before histogram as a reference dashed line"
            >
              Overlay Before
            </button>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="hist-chart-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="hist-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={zoom.onMouseDown}
          onMouseUp={zoom.endDrag}
          onDoubleClick={zoom.reset}
          style={{ cursor: zoom.zoomed ? "grab" : "default" }}
        >
          <defs>
            <linearGradient id="histGrayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="histRedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="histGreenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="histBlueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <clipPath id="histClip">
            <rect x={PAD.left} y={PAD.top - 2} width={PLOT_W} height={PLOT_H + 4} />
          </clipPath>

          {/* Grid lines */}
          <line
            x1={PAD.left}
            y1={PAD.top + PLOT_H}
            x2={W - PAD.right}
            y2={PAD.top + PLOT_H}
            className="hist-axis"
          />
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={PAD.top + PLOT_H}
            className="hist-axis"
          />

          <g clipPath="url(#histClip)">

          {/* Reference baseline overlay (Before) */}
          {overlayBaseline && baselineData && (
            <path
              d={createPath(
                activeChannel === "rgb"
                  ? baselineData.channels.gray
                  : baselineData.channels[activeChannel] || baselineData.channels.gray
              )}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="hist-baseline-path"
            />
          )}

          {/* Main Channels */}
          {activeChannel === "rgb" ? (
            <>
              {/* Red */}
              <path d={createAreaPath(channels.r)} fill="url(#histRedGrad)" />
              <path d={createPath(channels.r)} fill="none" stroke="#ef4444" strokeWidth="1.2" />
              {/* Green */}
              <path d={createAreaPath(channels.g)} fill="url(#histGreenGrad)" />
              <path d={createPath(channels.g)} fill="none" stroke="#22c55e" strokeWidth="1.2" />
              {/* Blue */}
              <path d={createAreaPath(channels.b)} fill="url(#histBlueGrad)" />
              <path d={createPath(channels.b)} fill="none" stroke="#3b82f6" strokeWidth="1.2" />
            </>
          ) : (
            <>
              <path
                d={createAreaPath(channels[activeChannel] || channels.gray)}
                fill={
                  activeChannel === "r"
                    ? "url(#histRedGrad)"
                    : activeChannel === "g"
                    ? "url(#histGreenGrad)"
                    : activeChannel === "b"
                    ? "url(#histBlueGrad)"
                    : "url(#histGrayGrad)"
                }
              />
              <path
                d={createPath(channels[activeChannel] || channels.gray)}
                fill="none"
                stroke={
                  activeChannel === "r"
                    ? "#ef4444"
                    : activeChannel === "g"
                    ? "#22c55e"
                    : activeChannel === "b"
                    ? "#3b82f6"
                    : "var(--accent)"
                }
                strokeWidth="1.5"
              />
            </>
          )}

          {/* Optional PDF line */}
          {showPdf && pdf && (
            <path
              d={(() => {
                const maxPdf = Math.max(...pdf) || 1;
                let d = `M ${getX(0)} ${PAD.top + PLOT_H * (1 - pdf[0] / maxPdf)}`;
                for (let i = 1; i < 256; i++) {
                  d += ` L ${getX(i)} ${PAD.top + PLOT_H * (1 - pdf[i] / maxPdf)}`;
                }
                return d;
              })()}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.8"
            />
          )}

          {/* Optional CDF line */}
          {showCdf && (
            <path
              d={(() => {
                let d = `M ${getX(0)} ${PAD.top + PLOT_H * (1 - cdf[0])}`;
                for (let i = 1; i < 256; i++) {
                  d += ` L ${getX(i)} ${PAD.top + PLOT_H * (1 - cdf[i])}`;
                }
                return d;
              })()}
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.6"
              strokeDasharray="3 2"
            />
          )}

          </g>

          {/* Axis Labels & Ticks */}
          <text x={PAD.left - 4} y={PAD.top + 5} className="hist-tick" textAnchor="end">
            {formatCount(maxBin)}
          </text>
          <text x={PAD.left - 4} y={PAD.top + PLOT_H} className="hist-tick" textAnchor="end">
            0
          </text>

          {(zoom.zoomed ? niceTicks(lo, hi) : [0, 64, 128, 192, 255]).map((t) => (
            <text key={t} x={getX(t)} y={H - 6} className="hist-tick" textAnchor="middle">
              {t}
            </text>
          ))}

          {/* Hover indicator */}
          {hoverBin !== null && (
            <>
              <line
                x1={getX(hoverBin)}
                y1={PAD.top}
                x2={getX(hoverBin)}
                y2={PAD.top + PLOT_H}
                className="hist-hover-line"
              />
              <circle
                cx={getX(hoverBin)}
                cy={getY(
                  activeChannel === "rgb"
                    ? channels.gray[hoverBin]
                    : channels[activeChannel]?.[hoverBin] ?? channels.gray[hoverBin]
                )}
                r="3"
                className="hist-hover-dot"
              />
            </>
          )}
        </svg>

        {/* Floating Tooltip during hover */}
        {hoverBin !== null && (
          <div className="hist-tooltip">
            <span className="hist-tt-level">Level: <b>{hoverBin}</b></span>
            {activeChannel === "rgb" ? (
              <span className="hist-tt-counts">
                <span style={{ color: "#ef4444" }}>R:{formatCount(channels.r[hoverBin])}</span>{" "}
                <span style={{ color: "#22c55e" }}>G:{formatCount(channels.g[hoverBin])}</span>{" "}
                <span style={{ color: "#3b82f6" }}>B:{formatCount(channels.b[hoverBin])}</span>
              </span>
            ) : (
              <span className="hist-tt-counts">
                Count: <b>{formatCount(channels[activeChannel]?.[hoverBin] ?? channels.gray[hoverBin])}</b>
                {" "}({(((channels[activeChannel]?.[hoverBin] ?? channels.gray[hoverBin]) / totalPixels) * 100).toFixed(1)}%)
              </span>
            )}
            {showPdf && pdf && (
              <span className="hist-tt-pdf" style={{ color: "#06b6d4" }}>
                PDF: {(pdf[hoverBin] * 100).toFixed(2)}%
              </span>
            )}
            {showCdf && (
              <span className="hist-tt-cdf" style={{ color: "#a855f7" }}>
                CDF: {(cdf[hoverBin] * 100).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Difference & Statistics Summary */}
      <div className="hist-stats">
        <div className="hist-stat-item">
          <span className="stat-label">Mean</span>
          <span className="stat-val">{stats.mean.toFixed(1)}</span>
          {deltas && (
            <span
              className={`stat-delta ${
                Math.abs(deltas.mean) < 0.1
                  ? "neutral"
                  : deltas.mean > 0
                  ? "positive"
                  : "negative"
              }`}
              title="Difference compared to Before (Δ = After - Before)"
            >
              {formatDelta(deltas.mean)}
            </span>
          )}
        </div>

        <div className="hist-stat-item">
          <span className="stat-label">Std (σ)</span>
          <span className="stat-val">{stats.std.toFixed(1)}</span>
          {deltas && (
            <span
              className={`stat-delta ${
                Math.abs(deltas.std) < 0.1
                  ? "neutral"
                  : deltas.std > 0
                  ? "positive"
                  : "negative"
              }`}
              title="Std Dev difference (lower = smoother/less noise, higher = contrast/noise)"
            >
              {formatDelta(deltas.std)}
            </span>
          )}
        </div>

        <div className="hist-stat-item">
          <span className="stat-label">Median</span>
          <span className="stat-val">{stats.median}</span>
          {deltas && (
            <span
              className={`stat-delta ${
                deltas.median === 0 ? "neutral" : deltas.median > 0 ? "positive" : "negative"
              }`}
            >
              {formatDelta(deltas.median, 0)}
            </span>
          )}
        </div>

        <div className="hist-stat-item">
          <span className="stat-label">Range</span>
          <span className="stat-val">
            [{stats.min}, {stats.max}]
          </span>
          {deltas && (deltas.min !== 0 || deltas.max !== 0) && (
            <span className="stat-delta neutral">
              Δ [{formatDelta(deltas.min, 0)}, {formatDelta(deltas.max, 0)}]
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
