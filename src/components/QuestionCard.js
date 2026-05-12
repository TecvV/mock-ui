import React from "react";
import "./Watermark.css";  // correct path since Watermark.css is in same folder

export default function QuestionCard({ question, selected, setSelected }) {
  return (
    <div className="border rounded shadow max-h-[400px] overflow-y-auto p-2 watermark">
      <p className="font-semibold mb-2">{question.question}</p>
      {question.options && question.options.map((opt, idx) => (
        <div key={idx}>
          <label>
            <input
              type="radio"
              name={`q${question.id}`}
              checked={selected === String(idx)}
              onChange={() => setSelected(String(idx))}
            />{" "}
            {opt}
          </label>
        </div>
      ))}
    </div>
  );
}




// import React from "react";
// import "./Watermark.css";

// export default function QuestionCard({ question, selected, setSelected }) {
//   return (
//     <div
//       className="border border-gray-300 bg-white"
//       style={{
//         borderRadius: 0,
//         padding: "14px",
//         fontFamily: "Arial, Verdana, sans-serif",
//         fontSize: "15px",
//         maxHeight: "320px",
//         overflowY: "auto",
//         boxShadow: "none",
//       }}
//     >
//       <p style={{ fontWeight: "bold", marginBottom: "18px" }}>{question.question}</p>
//       {question.options && question.options.map((opt, idx) => (
//         <label key={idx} style={{ display: "block", marginBottom: "12px", cursor: "pointer" }}>
//           <input
//             type="radio"
//             name={`q${question.id}`}
//             checked={selected === String(idx)}
//             onChange={() => setSelected(String(idx))}
//             style={{ marginRight: 6, verticalAlign: "middle" }}
//           />
//           {opt}
//         </label>
//       ))}
//     </div>
//   );
// }

