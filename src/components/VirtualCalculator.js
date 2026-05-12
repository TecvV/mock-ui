import React, { useState } from "react";

export default function VirtualCalculator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  const handleClick = (val) => setInput(prev => prev + val);
  const calculate = () => {
    try {
      setResult(eval(input).toString());
    } catch {
      setResult("Error");
    }
  };
  return (
    <div className="bg-gray-100 p-2 rounded w-40 text-xs">
      <div className="bg-white p-1 mb-1">{input} = {result}</div>
      <div className="grid grid-cols-4 gap-1">
        {[1,2,3,"+",4,5,6,"-",7,8,9,"*",0,".","/","="].map(b=>(
          <button key={b} onClick={()=> b==="=" ? calculate() : handleClick(b.toString())}
            className="bg-gray-300 p-1 rounded">{b}</button>
        ))}
        <button onClick={()=>setInput("")} className="col-span-4 bg-red-400 p-1 rounded">Clear</button>
      </div>
    </div>
  );
}
