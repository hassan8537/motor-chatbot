import React, { useRef, useState, useEffect } from "react";
import { BsSendFill } from "react-icons/bs";
import { CgProfile } from "react-icons/cg";

export default function Chat({
  onOpenSidebar,
  sidebarOpen,
  chat,
  onSendMessage,
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    await onSendMessage(input.trim());
    setInput("");
    setLoading(false);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  return (
    <main
      className="chat-container"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        color: "white",
        backgroundColor: "#343541",
        position: "relative",
      }}
    >
      {!sidebarOpen && (
        <button
          className="hamburger-btn"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            fontSize: "28px",
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          &#9776;
        </button>
      )}

      <div
        className="chat-area"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {chat ? (
          chat.messages.length > 0 ? (
            <>
              {chat.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`message ${msg.from === "bot" ? "bot" : "user"}`}
                  style={{
                    maxWidth: "75%",
                    padding: "12px 18px",
                    borderRadius: "15px",
                    lineHeight: 1.4,
                    backgroundColor: msg.from === "bot" ? "#444654" : "#202123",
                    alignSelf: msg.from === "bot" ? "flex-start" : "flex-end",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <CgProfile />
                  </p>
                  <p style={{ margin: 0 }}>{msg.text}</p>
                </div>
              ))}
              {loading && (
                <div
                  className="message bot"
                  style={{
                    maxWidth: "75%",
                    padding: "12px 18px",
                    borderRadius: "15px",
                    lineHeight: 1.4,
                    backgroundColor: "#444654",
                    alignSelf: "flex-start",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: 0.6,
                    fontStyle: "italic",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <CgProfile />
                  </p>
                  <p style={{ margin: 0 }}>Searching...</p>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: "#bbb" }}></p>
          )
        ) : (
          <h1
            style={{ color: "White" }}
            className="justify-content-center d-flex mt-5 "
          >
            Hi! Talk to me
          </h1>
        )}
      </div>

      {chat && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderTop: "1px solid #40414f",
            backgroundColor: "#343541",
          }}
        >
          <textarea
            ref={textareaRef}
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              borderRadius: "20px",
              border: "none",
              padding: "10px 16px",
              fontSize: "16px",
              backgroundColor: "#40414f",
              color: "white",
              outline: "none",
              lineHeight: "1.5",
              maxHeight: "150px",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                setInput("");
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            style={{
              marginLeft: "12px",
              backgroundColor: input.trim() ? "#10a37f" : "#555",
              border: "none",
              borderRadius: "50%",
              cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
            }}
            aria-label="Send message"
          >
            <BsSendFill />
          </button>
        </form>
      )}
    </main>
  );
}
