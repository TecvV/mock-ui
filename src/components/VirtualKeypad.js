import React from "react";

export default function VirtualKeypad({ value, setValue }) {
  const handleClick = (digit) => setValue((prev) => prev + digit);
  const handleBackspace = () => setValue((prev) => prev.slice(0, -1));

  return (
    <div className="virtual-keypad">
      <input value={value} readOnly className="keypad-display" />
      <div className="keypad-grid">
        <button onClick={handleBackspace} className="keypad-btn keypad-wide" type="button">
          Backspace
        </button>

        {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0, ".", "-"].map((digit) => (
          <button
            key={digit}
            onClick={() => handleClick(String(digit))}
            className="keypad-btn"
            type="button"
          >
            {digit}
          </button>
        ))}

        <button onClick={handleBackspace} className="keypad-btn" type="button">
          Del
        </button>
        <button onClick={() => setValue("")} className="keypad-btn" type="button">
          CLR
        </button>
        <button
          onClick={() => setValue("")}
          className="keypad-btn keypad-wide keypad-danger"
          type="button"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
