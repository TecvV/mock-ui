import React from "react";
import "./QuestionPalette.css";

export default function QuestionPalette({ questions, currentQ, setCurrentQ, answers, section, review }) {
  return (
    <div className="p-2 bg-blue-200 rounded text-center text-xs">
      <div className="bg-blue-500 text-white text-xs px-1 mb-1">{section}</div>
      <div className="grid grid-cols-4 gap-1">
        {questions.map((q, idx) => {
          const key = `${section}-${idx}`;
          const isAnswered = answers[key] !== undefined && answers[key] !== "";
          const isMarked = review.includes(key);

          let color = "bg-gray-300"; // Default: not visited
          if (isMarked && isAnswered) color = "bg-green-500 text-white"; // Answered & marked
          else if (isMarked) color = "bg-purple-500 text-white";          // Marked only
          else if (isAnswered) color = "bg-green-500 text-white";         // Answered only
          else color = "bg-red-500 text-white";                           // Not answered

          const shapeClass = (isAnswered || isMarked) ? "hex-shape" : "square-shape";

          return (
            <button
              key={q.id}
              onClick={() => setCurrentQ(idx)}
              className={`relative p-1 flex items-center justify-center ${color} ${shapeClass} ${
                currentQ === idx ? "ring-2 ring-black" : ""
              }`}
            >
              {q.id}
              {(isMarked && isAnswered) && (
                <span className="absolute top-0 right-0 text-lime-300 text-[10px]">✔</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}





// import React from "react";
// import "./QuestionPalette.css";

// export default function QuestionPalette({
//   questions,
//   currentQ,
//   setCurrentQ,
//   answers,
//   section,
//   review
// }) {
//   return (
//     <div
//       style={{
//         fontFamily: "Arial, Verdana, sans-serif",
//         fontSize: "13px",
//         width: "190px",
//         background: "#fff",
//         border: "1px solid #bfc0c0",
//         borderRadius: "0",
//         marginLeft: "8px",
//         marginTop: "0",
//         padding: "17px 6px"
//       }}
//     >
//       <div
//         style={{
//           background: "#204080",
//           color: "#fff",
//           fontWeight: "600",
//           fontSize: "12px",
//           textAlign: "center",
//           textTransform: "uppercase",
//           letterSpacing: "0.5px",
//           borderRadius: "0",
//           marginBottom: 9,
//           padding: "4px 0"
//         }}
//       >
//         {section}
//       </div>
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
//         {questions.map((q, idx) => {
//           const key = `${section}-${idx}`;
//           const isAnswered = answers[key] !== undefined && answers[key] !== "";
//           const isMarked = review.includes(key);
//           const visited = isAnswered || isMarked || currentQ === idx;
//           let className = "palette-btn palette-not-visited";
//           if (!visited) className = "palette-btn palette-not-visited";
//           else if (isMarked && isAnswered) className = "palette-btn palette-answered-review";
//           else if (isMarked) className = "palette-btn palette-review";
//           else if (isAnswered) className = "palette-btn palette-answered";
//           else className = "palette-btn palette-not-answered";
//           if (currentQ === idx) className += " palette-current";

//           return (
//             <button
//               key={q.id}
//               onClick={() => setCurrentQ(idx)}
//               className={className}
//               title={`Question ${q.id}`}
//               style={{ position: "relative" }}
//             >
//               {q.id}
//               {(isMarked && isAnswered) && (
//                 <span style={{
//                   position: "absolute",
//                   right: 2,
//                   top: 2,
//                   color: "#faf36d",
//                   fontSize: "12px"
//                 }}>✔</span>
//               )}
//             </button>
//           );
//         })}
//       </div>
//       {/* Palette Legend */}
//       <div style={{ marginTop: "14px", marginBottom: "2px", lineHeight: "17px" }}>
//         <div className="palette-legend-row">
//           <span className="palette-legend-dot" style={{ background: "#e0e0e0", border: "1px solid #bfc0c0" }}></span>
//           Not Visited
//         </div>
//         <div className="palette-legend-row">
//           <span className="palette-legend-dot" style={{ background: "#fd5c63" }}></span>
//           Not Answered
//         </div>
//         <div className="palette-legend-row">
//           <span className="palette-legend-dot" style={{ background: "#48bb78" }}></span>
//           Answered
//         </div>
//         <div className="palette-legend-row">
//           <span className="palette-legend-dot" style={{ background: "#6b47dc" }}></span>
//           Marked for Review
//         </div>
//         <div className="palette-legend-row">
//           <span className="palette-legend-dot" style={{ background: "#7c3aed", border: "2px solid #48bb78" }}></span>
//           Answered & Marked for Review
//         </div>
//       </div>
//     </div>
//   );
// }
