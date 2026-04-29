export default function Legend({ items, title }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="legend">
      {title && <h4 className="legend-title">{title}</h4>}
      {/* Gradient bar preview */}
      <div className="legend-gradient-bar">
        {items.map((item, i) => (
          <span
            key={i}
            className="legend-gradient-segment"
            style={{ backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="legend-items">
        {items.map((item, i) => (
          <div key={i} className="legend-item">
            <span
              className="legend-swatch"
              style={{ backgroundColor: item.color }}
            />
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
