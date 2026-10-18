import ImageHistogram from "./ImageHistogram.jsx";

export default function ImageCard({
  title,
  src,
  placeholder = "No image yet",
  showHistogram = true,
  baselineData = null,
  onHistogramLoaded = null,
  compact = false,
}) {
  return (
    <figure className="card image-card-with-hist">
      <figcaption>{title}</figcaption>
      {src ? <img src={src} alt={title} /> : <div className="placeholder">{placeholder}</div>}
      {src && showHistogram && (
        <div className="card-hist-wrapper">
          <ImageHistogram
            src={src}
            baselineData={baselineData}
            onDataLoaded={onHistogramLoaded}
            compact={compact}
          />
        </div>
      )}
    </figure>
  );
}
