import React from "react";
export default function NavigationButtons({ onSaveNext, onClear, onMark }) {
  return (
    <div className="flex gap-2 mt-4">
      <button onClick={onSaveNext} className="bg-blue-500 text-white px-3 py-1 rounded">Save & Next</button>
      <button onClick={onClear} className="bg-gray-500 text-white px-3 py-1 rounded">Clear Response</button>
      <button onClick={onMark} className="bg-purple-500 text-white px-3 py-1 rounded">Mark for Review & Next</button>
    </div>
  );
}
