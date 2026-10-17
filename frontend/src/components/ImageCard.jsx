export default function ImageCard({ title, src, placeholder = "No image yet" }) {
  return (
    <figure className="card">
      <figcaption>{title}</figcaption>
      {src ? <img src={src} alt={title} /> : <div className="placeholder">{placeholder}</div>}
    </figure>
  );
}
