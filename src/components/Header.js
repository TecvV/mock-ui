import React from "react";
export default function Header({ user, timeLeft }) {
  return (
    <div className="flex justify-between items-center p-2 bg-blue-600 text-white">
      <div>
        <h1 className="text-lg font-semibold">CAT Mock Test</h1>
        <p>User: {user}</p>
      </div>
      <div className="text-xl font-mono">Time Left: {timeLeft}</div>
    </div>
  );
}
