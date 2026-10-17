import { useEffect, useState } from "react";
import { runTaskSafe, toSrc } from "../api.js";
import { defaultValues } from "../tasks.js";
import BeforeAfter from "../components/BeforeAfter.jsx";
import OptionsForm from "../components/OptionsForm.jsx";
import Outputs from "../components/Outputs.jsx";

/* Preview tab: options -> Apply -> Before/After + extra outputs. */
export default function TaskView({ task, images, beforeSrc, onUseAsInput }) {
  const [values, setValues] = useState(() => defaultValues(task));
  const [run, setRun] = useState({ response: null, error: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => setRun({ response: null, error: "" }), [images]); // new input -> old result is stale

  const ready = task.inputs.every((_, i) => images[i]);
  const resultPng = task.result && run.response?.[task.result.key];

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

      {task.result && beforeSrc && (
        <BeforeAfter before={beforeSrc} after={resultPng && toSrc(resultPng)} afterLabel={task.result.label} />
      )}
      {run.response && <Outputs items={task.outputs} response={run.response} />}
    </>
  );
}
