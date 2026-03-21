/**
 * Shared color picker row used across all create forms.
 *
 * Props:
 *   colors      – string[]  preset color swatches
 *   value       – string    currently selected color
 *   onChange    – fn(color) called when a swatch or custom color is picked
 *   customColor – string    current value of the hidden <input type="color">
 *   onCustomChange – fn(color) called when the custom picker changes
 */
export default function ColorPicker({ colors, value, onChange, customColor, onCustomChange }) {
  return (
    <div className="color-picker-row">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={`color-btn${value === color ? " active" : ""}`}
          style={{ background: color }}
          onClick={() => onChange(color)}
        />
      ))}
      <label
        className={`color-btn color-btn--picker${value === customColor && !colors.includes(value) ? " active" : ""}`}
        title="Custom color"
        style={{ background: customColor, position: "relative", overflow: "hidden" }}
      >
        <input
          type="color"
          value={customColor}
          onChange={(e) => {
            onCustomChange(e.target.value);
            onChange(e.target.value);
          }}
          style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0 }}
        />
      </label>
    </div>
  );
}
