import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./MentionInput.css";

/**
 * Unified @mention-aware input/textarea.
 *
 * Props:
 *   value        string           controlled value
 *   onChange     (string) => void called with new string (not event)
 *   onKeyDown    (e) => void      called for keys NOT consumed by the dropdown
 *   multiline    bool             renders <textarea> when true, <input> when false
 *   placeholder  string
 *   maxLength    number
 *   rows         number           only used when multiline=true
 *   className    string           applied to the input/textarea element
 *   disabled     bool
 *
 * Ref: forwarded to the underlying input/textarea element.
 */
const MentionInput = forwardRef(function MentionInput(
  {
    value,
    onChange,
    onKeyDown,
    multiline = true,
    placeholder,
    maxLength,
    rows = 3,
    className = "",
    disabled = false,
    ...rest
  },
  ref,
) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const innerRef = useRef(null);
  const timerRef = useRef(null);

  // Expose the real DOM node through the forwarded ref
  useImperativeHandle(ref, () => innerRef.current, []);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    setSuggestions([]);
    setActiveIndex(0);
  }, []);

  const selectUser = useCallback(
    (username) => {
      const el = innerRef.current;
      const cursor = el?.selectionStart ?? value.length;
      const before = value.slice(0, cursor).replace(/@([a-zA-Z0-9_]*)$/, `@${username} `);
      const after = value.slice(cursor);
      const next = before + after;
      onChange(next);
      closeDropdown();
      setTimeout(() => {
        el?.focus();
        el?.setSelectionRange(before.length, before.length);
      }, 0);
    },
    [value, onChange, closeDropdown],
  );

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      onChange(val);
      const cursor = e.target.selectionStart;
      const match = val.slice(0, cursor).match(/@([a-zA-Z0-9_]*)$/);
      if (!match) { closeDropdown(); return; }
      const q = match[1];
      setShowDropdown(true);
      setActiveIndex(0);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          const usersQuery = q
            ? query(collection(db, "users"), where("username", ">=", q), where("username", "<=", q + "\uf8ff"), limit(6))
            : query(collection(db, "users"), limit(6));
          const snap = await getDocs(usersQuery);
          setSuggestions(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((u) => u.username));
        } catch {
          setSuggestions([]);
        }
      }, 150);
    },
    [onChange, closeDropdown],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (showDropdown && suggestions.length > 0) {
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); return; }
        if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
        if (e.key === "Enter")     { e.preventDefault(); selectUser(suggestions[activeIndex].username); return; }
        if (e.key === "Escape")    { closeDropdown(); return; }
      }
      onKeyDown?.(e);
    },
    [showDropdown, suggestions, activeIndex, selectUser, closeDropdown, onKeyDown],
  );

  const Field = multiline ? "textarea" : "input";

  return (
    <div className="mention-input-wrap">
      {showDropdown && suggestions.length > 0 && (
        <div className="mention-input-dropdown" role="listbox">
          {suggestions.map((user, i) => (
            <button
              key={user.uid}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              className={`mention-input-option${i === activeIndex ? " active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); selectUser(user.username); }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {user.avatar
                ? <img src={user.avatar} alt="" className="mention-input-avatar" />
                : <div className="mention-input-avatar mention-input-avatar--placeholder">{user.username?.[0]?.toUpperCase()}</div>
              }
              <div className="mention-input-info">
                <span className="mention-input-username">@{user.username}</span>
                {user.displayName && <span className="mention-input-name">{user.displayName}</span>}
              </div>
              {i === activeIndex && <span className="mention-input-hint">↵</span>}
            </button>
          ))}
          <div className="mention-input-footer">
            <kbd>↑↓</kbd> navigate · <kbd>↵</kbd> select · <kbd>Esc</kbd> close
          </div>
        </div>
      )}
      <Field
        ref={innerRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(closeDropdown, 150)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={multiline ? rows : undefined}
        className={className}
        disabled={disabled}
        {...(Field === "input" ? { type: "text" } : {})}
        {...rest}
      />
    </div>
  );
});

export default MentionInput;
