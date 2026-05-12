import React from "react";
import VirtualKeypad from "./VirtualKeypad";
import "./Watermark.css";  // correct path since Watermark.css is in same folder

export default function PartitionedQuestionCard({ question, selected, setSelected }) {
  return (
    <div className="flex border rounded watermark">
      {/* Left: passage or setText */}
      <div className="w-1/2 p-2 border-r overflow-y-auto max-h-[400px]">
        <div className="text-sm whitespace-pre-wrap">{question.passage || question.setText}</div>
      </div>
      {/* Right: question + options */}
      <div className="w-1/2 p-2">
        <p className="mb-2 font-semibold">{question.question}</p>
        {question.options && question.options.map((opt, idx) => (
          <label key={idx} className="block mb-1">
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={selected === String(idx)}
              onChange={() => setSelected(String(idx))}
            />{" "}
            {opt}
          </label>
        ))}
        {question.type === "TITA" && (
          <VirtualKeypad value={selected} setValue={setSelected} />
        )}
      </div>
    </div>
  );
}




// import React from "react";
// import VirtualKeypad from "./VirtualKeypad";
// import "./Watermark.css";

// export default function PartitionedQuestionCard({ question, selected, setSelected }) {
//   return (
//     <div
//       className="border border-gray-300 bg-white"
//       style={{ display: "flex", minHeight: "260px", maxHeight: "320px", borderRadius: "0", boxShadow: "none" }}
//     >
//       {/* Left: Passage/setText */}
//       <div
//         style={{
//           width: "48%",
//           borderRight: "1px solid #bfc0c0",
//           padding: "14px",
//           overflowY: "auto",
//           fontFamily: "Arial, Verdana, sans-serif",
//           fontSize: "15px",
//           background: "#f7faff"
//         }}
//       >
//         {question.passage || question.setText}
//       </div>
//       {/* Right: Question & Options */}
//       <div
//         style={{
//           width: "52%",
//           padding: "14px",
//           fontFamily: "Arial, Verdana, sans-serif",
//           fontSize: "15px"
//         }}
//       >
//         <p style={{ fontWeight: "bold", marginBottom: "18px" }}>{question.question}</p>
//         {question.options && question.options.map((opt, idx) => (
//           <label key={idx} style={{ display: "block", marginBottom: "12px", cursor: "pointer" }}>
//             <input
//               type="radio"
//               name={`q-${question.id}`}
//               checked={selected === String(idx)}
//               onChange={() => setSelected(String(idx))}
//               style={{ marginRight: 6, verticalAlign: "middle" }}
//             />
//             {opt}
//           </label>
//         ))}
//         {question.type === "TITA" && (
//           <VirtualKeypad value={selected} setValue={setSelected} />
//         )}
//       </div>
//     </div>
//   );
// }

