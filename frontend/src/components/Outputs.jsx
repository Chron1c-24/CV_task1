import { toSrc } from "../api.js";
import Chart from "./Chart.jsx";
import ImageCard from "./ImageCard.jsx";

const valueAt = (obj, path) => path.split(".").reduce((o, key) => o?.[key], obj);

/* Renders task.outputs from one response. null images (e.g. Canny gradients) are skipped. */
export default function Outputs({ items, response }) {
  const cards = items.flatMap((item) => {
    if (item.type === "chart") {
      const series = item.series.map((s) => ({ ...s, values: valueAt(response, s.path) }));
      return [<Chart key={item.label} title={item.label} unit={item.unit} mode={item.mode} series={series} />];
    }
    if (item.type === "imageList") {
      return response[item.key].map((png, i) => (
        <ImageCard key={`${item.key}-${i}`} title={`${item.label} ${i + 1}`} src={toSrc(png)} />
      ));
    }
    const png = response[item.key];
    return png ? [<ImageCard key={item.key} title={item.label} src={toSrc(png)} />] : [];
  });

  if (!cards.length) return null;
  return (
    <section className="panel">
      <h3>Outputs</h3>
      <div className="grid">{cards}</div>
    </section>
  );
}
