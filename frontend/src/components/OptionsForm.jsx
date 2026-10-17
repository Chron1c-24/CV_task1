/* Form for task.options. hidden = option names locked by a Compare variant. */
export default function OptionsForm({ options, values, onChange, hidden = [] }) {
  const visible = options.filter(
    (option) => !hidden.includes(option.name) && (!option.showIf || option.showIf(values))
  );
  if (!visible.length) return <p className="muted">No options for this task.</p>;

  return (
    <div className="options">
      {visible.map((option) => (
        <label key={option.name} className="option">
          <span>
            {option.label} {option.unit && <small>({option.unit})</small>}
          </span>
          {option.type === "select" ? (
            <select value={values[option.name]} onChange={(e) => onChange(option.name, e.target.value)}>
              {option.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
            </select>
          ) : (
            <input
              type="number"
              value={values[option.name]}
              min={option.min} max={option.max} step={option.step ?? (option.type === "int" ? 1 : "any")}
              onChange={(e) => onChange(option.name, e.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  );
}
