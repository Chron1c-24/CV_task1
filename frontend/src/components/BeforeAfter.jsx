import { useState } from "react";
import ImageCard from "./ImageCard.jsx";

/* Original vs result: side by side, or one image with a drag slider (needs the same H x W). */
export default function BeforeAfter({ before, after, afterLabel }) {
  const [mode, setMode] = useState("side");
  const [split, setSplit] = useState(50); // percent of the width that shows the original

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Before / After</h3>
        <div className="toggle">
          <button className={mode === "side" ? "active" : ""} onClick={() => setMode("side")}>Side by side</button>
          <button className={mode === "slider" ? "active" : ""} onClick={() => setMode("slider")} disabled={!after}>
            Slider
          </button>
        </div>
      </div>

      {mode === "slider" && after ? (
        <div className="slider">
          <img src={after} alt={afterLabel} className="slider-base" />
          <img src={before} alt="Original" className="slider-top" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
          <div className="slider-line" style={{ left: `${split}%` }} />
          <span className="slider-tag left">Original</span>
          <span className="slider-tag right">{afterLabel}</span>
          <input
            type="range" min="0" max="100" value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label="Before / after split"
          />
        </div>
      ) : (
        <div className="grid two">
          <ImageCard title="Original" src={before} />
          <ImageCard title={afterLabel} src={after} placeholder="Press Apply to see the result" />
        </div>
      )}
    </section>
  );
}
