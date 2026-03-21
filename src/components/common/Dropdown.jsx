import { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "../../utils/icons";
import "./Dropdown.css";

/**
 * Reusable Dropdown Component
 * @param {string} label - Button label text
 * @param {Array} items - Array of { label, onClick, isDanger } items
 * @param {string} className - Additional CSS classes
 * @param {string} variant - 'default' (hover) or 'user' (click-only)
 */
export default function Dropdown({ label, items, className = "", variant = "default" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const closeTimerRef = useRef(null);

  // Close dropdown on outside click (for user/click variant)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const handleMouseEnter = () => {
    clearTimeout(closeTimerRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 120);
  };

  const handleItemClick = (onClick) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <div
      className={`dropdown-wrapper ${variant} ${className}`}
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`dropdown-button${isOpen ? " open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span>{label}</span>
        <ChevronDownIcon
          size={variant === "user" ? 18 : 16}
          style={{
            marginLeft: "0.5rem",
            transition: "transform 0.3s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {items.map((item, idx) => (
            <button
              key={idx}
              className={`dropdown-item ${item.isDanger ? "danger" : ""}`}
              onClick={() => handleItemClick(item.onClick)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
