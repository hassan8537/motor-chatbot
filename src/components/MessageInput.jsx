import React, { useState } from "react";

export default function MessageInput({ onSend }) {
  const [text, setText] = useState("");

  const handleSend = async () => {
    if (!text.trim()) return;

    try {
      const response = await onSend(text); // <== Await response here
      console.log("Bot reply in MessageInput:", response?.data?.answer);
    } catch (error) {
      console.error("Error in MessageInput:", error);
    }

    setText("");
  };

  return (
    <div className="chat-input border-top p-3 bg-white d-flex align-items-center">
      <input
        type="text"
        className="form-control me-2"
        placeholder="Type your message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        autoFocus
      />
      <button className="btn btn-primary" onClick={handleSend}>
        Send
      </button>
    </div>
  );
}
