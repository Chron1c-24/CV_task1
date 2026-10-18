import { useEffect, useState } from "react";
import { runTaskSafe, toSrc } from "../api.js";
import { defaultValues, resultFor } from "../tasks.js";
import BeforeAfter from "../components/BeforeAfter.jsx";
import ImageCard from "../components/ImageCard.jsx";
import OptionsForm from "../components/OptionsForm.jsx";
import Outputs from "../components/Outputs.jsx";

/* Preview tab: options -> Apply -> Before/After + extra outputs. */
export default function TaskView({ task, images, urls, beforeSrc, onUseAsInput }) {
  const [values, setValues] = useState(() => defaultValues(task));
  const [run, setRun] = useState({ response: null, error: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => setRun({ response: null, error: "" }), [images]); // new input -> old result is stale

  const ready = task.inputs.every((_, i) => images[i]);
  const result = resultFor(task, values);
  const resultPng = result && run.response?.[result.key];

  async function apply() {
    setLoading(true);
    setRun(await runTaskSafe(task, values, images));
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
          <button onClick={() => setValues(defaultValues(task))}>Reset options</button>
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
