import { useState } from "react";
import { runTaskSafe, toSrc } from "../api.js";
import { defaultValues, resultFor } from "../tasks.js";
import { useSaved } from "../utils/useSaved.js";
import BeforeAfter from "../components/BeforeAfter.jsx";
import ImageCard from "../components/ImageCard.jsx";
import OptionsForm from "../components/OptionsForm.jsx";
import Outputs from "../components/Outputs.jsx";

const EMPTY_RUN = { response: null, error: "" };

/* Saved preview state after a new input image: keep the options, drop the stale result. */
export const clearPreviewRun = (state) => ({ ...state, run: EMPTY_RUN });

/*
 * Preview tab: options -> Apply -> Before/After + extra outputs.
 * saved / onSave: this task's {values, run}, kept in App so it survives switching task or tab.
 */
export default function TaskView({ task, images, urls, beforeSrc, onUseAsInput, saved, onSave }) {
  const [{ values, run }, setState] = useSaved(saved, onSave, () => ({ values: defaultValues(task), run: EMPTY_RUN }));
  const [loading, setLoading] = useState(false);

  const setValues = (next) => setState((prev) => ({ ...prev, values: next(prev.values) }));
  const ready = task.inputs.every((_, i) => images[i]);
  const result = resultFor(task, values);
  const resultPng = result && run.response?.[result.key];

  async function apply() {
    setLoading(true);
    const newRun = await runTaskSafe(task, values, images);
    setState((prev) => ({ ...prev, run: newRun }));
    setLoading(false);
  }

  return (
    <>
      <section className="panel">
        <h2>{task.label}</h2>
        <p className="muted">{task.description}</p>
        <OptionsForm
          options={task.options}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
        <div className="actions">
          <button className="primary" onClick={apply} disabled={!ready || loading}>
            {loading ? "Running…" : "Apply"}
          </button>
          <button onClick={() => setValues(() => defaultValues(task))}>Reset options</button>
          {resultPng && <button onClick={() => onUseAsInput(resultPng)}>Use result as input</button>}
        </div>
        {!ready && <p className="muted">Upload {task.inputs.length > 1 ? "both images" : "an image"} first.</p>}
        {run.error && <p className="error">{run.error}</p>}
      </section>

      {/* For tasks with a direct result (noise, filters, edges, equalization, normalization, etc.) */}
      {result && beforeSrc && (
        <BeforeAfter before={beforeSrc} after={resultPng && toSrc(resultPng)} afterLabel={result.label} />
      )}

      {/* For single-input tasks without a single result (Task 4 Histogram, Task 8 RGB histograms) */}
      {!task.result && task.inputs.length === 1 && beforeSrc && (
        <section className="panel">
          <div className="panel-head">
            <h3>Input Image & Histogram</h3>
          </div>
          <div className="grid two">
            <ImageCard title="Input Image" src={beforeSrc} />
          </div>
        </section>
      )}

      {/* For hybrid image task (2 inputs) */}
      {!task.result && task.inputs.length > 1 && (urls?.[0] || urls?.[1]) && (
        <section className="panel">
          <div className="panel-head">
            <h3>Input Images</h3>
          </div>
          <div className="grid two">
            <ImageCard title="Far Image (Low frequencies)" src={urls?.[0]} placeholder="Upload far image" />
            <ImageCard title="Near Image (High frequencies)" src={urls?.[1]} placeholder="Upload near image" />
          </div>
        </section>
      )}

      {run.response && <Outputs items={task.outputs} response={run.response} />}
    </>
  );
}
