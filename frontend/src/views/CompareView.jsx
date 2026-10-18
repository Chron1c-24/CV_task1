import { useEffect, useState } from "react";
import { runTaskSafe, toSrc } from "../api.js";
import { TASK_BY_ID, defaultValues } from "../tasks.js";
import ImageCard from "../components/ImageCard.jsx";
import OptionsForm from "../components/OptionsForm.jsx";

/* Compare tab: the same input through every variant, results side by side with histograms under each photo. */
export default function CompareView({ compare, images, beforeSrc }) {
  const variants = compare.variants.map((v) => ({ ...v, task: TASK_BY_ID[v.taskId], fixed: v.fixed ?? {} }));
  const [values, setValues] = useState(() => variants.map((v) => defaultValues(v.task, v.fixed)));
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [originalHist, setOriginalHist] = useState(null);

  useEffect(() => setRuns([]), [images]); // new input -> old results are stale

  function setValue(index, name, value) {
    setValues((prev) => prev.map((v, i) => (i === index ? { ...v, [name]: value } : v)));
  }

  async function runAll() {
    setLoading(true);
    setRuns(await Promise.all(variants.map((v, i) => runTaskSafe(v.task, values[i], images))));
    setLoading(false);
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>{compare.title}</h2>
          <button className="primary" onClick={runAll} disabled={!images[0] || loading}>
            {loading ? "Running…" : "Run all"}
          </button>
        </div>
        {!images[0] && <p className="muted">Upload an image first.</p>}
      </section>

      <section className="grid compare">
        <ImageCard
          title="Original"
          src={beforeSrc}
          placeholder="Choose an image"
          onHistogramLoaded={setOriginalHist}
        />
        {variants.map((v, i) => {
          const png = runs[i]?.response?.[v.task.result.key];
          return (
            <div key={v.label} className="compare-col">
              <ImageCard
                title={v.label}
                src={png && toSrc(png)}
                placeholder="Press Run all"
                baselineData={originalHist}
              />
              {runs[i]?.error && <p className="error">{runs[i].error}</p>}
              <OptionsForm
                options={v.task.options}
                values={values[i]}
                hidden={Object.keys(v.fixed)}
                onChange={(name, value) => setValue(i, name, value)}
              />
            </div>
          );
        })}
      </section>
    </>
  );
}
