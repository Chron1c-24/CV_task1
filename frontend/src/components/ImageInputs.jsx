const INPUT_LABELS = {
  image: "Input image",
  img_far: "Far image (kept as low-pass)",
  img_near: "Near image (kept as high-pass)",
};

/* One upload per name in task.inputs, with a thumbnail of the chosen file. */
export default function ImageInputs({ inputs, urls, onSelect }) {
  return (
    <section className="panel inputs">
      {inputs.map((name, i) => (
        <label key={name} className="upload">
          <span>{INPUT_LABELS[name]}</span>
          <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && onSelect(i, e.target.files[0])} />
          {urls[i] ? <img src={urls[i]} alt={INPUT_LABELS[name]} /> : <div className="placeholder">Choose an image</div>}
        </label>
      ))}
    </section>
  );
}
