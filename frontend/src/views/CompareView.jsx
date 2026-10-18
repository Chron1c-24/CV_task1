import { useEffect, useMemo, useState } from "react";
import { runTaskSafe, toSrc } from "../api.js";
import { TASK_BY_ID, defaultValues } from "../tasks.js";
import ImageCard from "../components/ImageCard.jsx";
import OptionsForm from "../components/OptionsForm.jsx";

/*
 * Compare tab: allows user to open independent comparison windows.
 * Each window has its own type dropdown and completely independent parameters.
 */
export default function CompareView({ compare, images, beforeSrc }) {
  // All available variants in this comparison group
  const allVariants = useMemo(
    () =>
      compare.variants.map((v) => ({
        label: v.label,
        taskId: v.taskId,
        task: TASK_BY_ID[v.taskId],
        fixed: v.fixed ?? {},
      })),
    [compare]
  );

  const [showOriginal, setShowOriginal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [originalHist, setOriginalHist] = useState(null);

  // Each comparison slot has its own independent id, type, parameters, and result
  const [slots, setSlots] = useState(() => {
    const v1 = allVariants[0];
    const v2 = allVariants[1] || allVariants[0];
    return [
      {
        id: `slot_${Date.now()}_1`,
        variantLabel: v1.label,
        values: defaultValues(v1.task, v1.fixed),
        run: null,
        error: "",
      },
      {
        id: `slot_${Date.now()}_2`,
        variantLabel: v2.label,
        values: defaultValues(v2.task, v2.fixed),
        run: null,
        error: "",
      },
    ];
  });

  // Reset comparison windows when the compare group changes
  useEffect(() => {
    const v1 = allVariants[0];
    const v2 = allVariants[1] || allVariants[0];
    setSlots([
      {
        id: `slot_${Date.now()}_1`,
        variantLabel: v1.label,
        values: defaultValues(v1.task, v1.fixed),
        run: null,
        error: "",
      },
      {
        id: `slot_${Date.now()}_2`,
        variantLabel: v2.label,
        values: defaultValues(v2.task, v2.fixed),
        run: null,
        error: "",
      },
    ]);
  }, [compare, allVariants]);

  // When input images change, clear stale run results
  useEffect(() => {
    setSlots((prev) => prev.map((s) => ({ ...s, run: null, error: "" })));
  }, [images]);

  // Change type of a specific window
  const changeSlotType = (slotId, newLabel) => {
    const newVariant = allVariants.find((v) => v.label === newLabel);
    if (!newVariant) return;

    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        return {
          ...slot,
          variantLabel: newLabel,
          values: defaultValues(newVariant.task, newVariant.fixed),
          run: null,
          error: "",
        };
      })
    );
  };

  // Update option values for ONLY this specific window
  const setSlotOption = (slotId, optName, optValue) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        return {
          ...slot,
          values: {
            ...slot.values,
            [optName]: optValue,
          },
        };
      })
    );
  };

  // Add a new comparison window
  const addSlot = () => {
    const defaultVariant = allVariants[slots.length % allVariants.length] || allVariants[0];
    setSlots((prev) => [
      ...prev,
      {
        id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        variantLabel: defaultVariant.label,
        values: defaultValues(defaultVariant.task, defaultVariant.fixed),
        run: null,
        error: "",
      },
    ]);
  };

  // Remove a specific comparison window
  const removeSlot = (slotId) => {
    setSlots((prev) => {
      if (prev.length <= 1) return prev; // Keep at least one window
      return prev.filter((s) => s.id !== slotId);
    });
  };

  // Run all comparison windows
  async function runAll() {
    if (!images[0] || slots.length === 0) return;
    setLoading(true);

    const results = await Promise.all(
      slots.map((slot) => {
        const variant = allVariants.find((v) => v.label === slot.variantLabel);
        if (!variant) return Promise.resolve({ response: null, error: "Variant not found" });
        return runTaskSafe(variant.task, slot.values, images);
      })
    );

    setSlots((prev) =>
      prev.map((slot, i) => ({
        ...slot,
        run: results[i]?.response || null,
        error: results[i]?.error || "",
      }))
    );

    setLoading(false);
  }

  // Run a single specific comparison window
  async function runSingleSlot(slotId) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot || !images[0]) return;

    const variant = allVariants.find((v) => v.label === slot.variantLabel);
    if (!variant) return;

    const result = await runTaskSafe(variant.task, slot.values, images);

    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        return {
          ...s,
          run: result.response,
          error: result.error,
        };
      })
    );
  }

  return (
    <>
      <section className="panel compare-control-panel">
        <div className="panel-head">
          <div className="compare-title-wrap">
            <h2>{compare.title}</h2>
            <p className="muted compare-subtext">
              Each window is fully independent. Use the dropdown in each window to select its type and set its own parameters.
            </p>
          </div>
          <div className="compare-actions">
            <button
              type="button"
              className="compare-add-slot-btn"
              onClick={addSlot}
              title="Add another independent comparison window"
            >
              + Add Window
            </button>
            <label className="compare-toggle-label">
              <input
                type="checkbox"
                checked={showOriginal}
                onChange={(e) => setShowOriginal(e.target.checked)}
              />
              <span>Include Original</span>
            </label>
            <button
              className="primary"
              onClick={runAll}
              disabled={!images[0] || loading || slots.length === 0}
            >
              {loading ? "Running…" : `Run Compare (${slots.length})`}
            </button>
          </div>
        </div>

        {!images[0] && <p className="muted">Upload an image first to compare.</p>}
      </section>

      {/* Grid of independent comparison windows */}
      <section className="grid compare">
        {showOriginal && (
          <ImageCard
            title="Original"
            src={beforeSrc}
            placeholder="Choose an image"
            onHistogramLoaded={setOriginalHist}
          />
        )}

        {slots.map((slot) => {
          const variant = allVariants.find((v) => v.label === slot.variantLabel) || allVariants[0];
          const png = slot.run?.[variant.task.result.key];

          return (
            <div key={slot.id} className="compare-col card">
              {/* Card Header with Dropdown to select type */}
              <div className="compare-card-head">
                <div className="compare-type-picker">
                  <span className="picker-label">Type:</span>
                  <select
                    value={slot.variantLabel}
                    onChange={(e) => changeSlotType(slot.id, e.target.value)}
                    className="compare-inline-select"
                  >
                    {allVariants.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="compare-card-actions">
                  <button
                    type="button"
                    className="compare-single-run-btn"
                    onClick={() => runSingleSlot(slot.id)}
                    disabled={!images[0] || loading}
                    title="Run only this window"
                  >
                    Run
                  </button>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      className="compare-close-btn"
                      onClick={() => removeSlot(slot.id)}
                      title="Remove this comparison window"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Image & Histogram under photo */}
              <ImageCard
                title={slot.variantLabel}
                src={png && toSrc(png)}
                placeholder="Press Run Compare"
                baselineData={originalHist}
              />

              {slot.error && <p className="error">{slot.error}</p>}

              {/* Independent options form for this window only */}
              <div className="compare-options-container">
                <OptionsForm
                  options={variant.task.options}
                  values={slot.values}
                  hidden={Object.keys(variant.fixed)}
                  onChange={(name, value) => setSlotOption(slot.id, name, value)}
                />
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
