import React, { useRef, useState, useEffect } from "react";
import { CgProfile } from "react-icons/cg";
import { BsRobot } from "react-icons/bs";
import { IoIosArrowDown } from "react-icons/io";
import Cookies from "js-cookie";
import BASE_URL from "../config";

export default function Chat({ onOpenSidebar, sidebarOpen, onSendMessage }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [myChats, setMyChats] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMoreChats, setHasMoreChats] = useState(true);

  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const token = Cookies.get("token");

  const fetchChats = async (pagination = false) => {
    if (pagination && (!hasMoreChats || paginationLoading)) return;

    const url = new URL(`${BASE_URL}/api/v1/qdrant/chats`);
    if (pagination && nextPageToken) url.searchParams.append("next", nextPageToken);

    try {
      if (pagination) setPaginationLoading(true);
      else setChatsLoading(true);

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      const newChats = data?.data?.chats || [];

      setMyChats((prev) => (pagination ? [...newChats, ...prev] : newChats));
      setNextPageToken(data?.data?.nextPageToken || null);
      setHasMoreChats(Boolean(data?.data?.nextPageToken));
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setChatsLoading(false);
      setPaginationLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchChats(false);
  }, [token]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    const userMsg = { query: trimmed, answer: "..." };
    setMyChats((prev) => [...prev, userMsg]);

    try {
      const response = await onSendMessage(trimmed);
      const answer = response?.data?.answer || "No response from bot.";
      setMyChats((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], answer };
        return updated;
      });
    } catch (error) {
      console.error("Send failed:", error);
      alert("Failed to send message.");
    } finally {
      setInput("");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || paginationLoading) return;
  
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  
    if (isNearBottom || loading) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [myChats]);
  

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const atTop = container.scrollTop < 100;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (atTop && !paginationLoading && hasMoreChats) {
      const prevScrollHeight = container.scrollHeight;
      fetchChats(true).then(() => {
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        });
      });
    }

    setShowScrollButton(!atBottom);
  };

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        color: "white",
        backgroundColor: "#1e1f24",
        position: "relative"
      }}
    >
      {!sidebarOpen && (
        <button
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
            zIndex: 10
          }}
        >
          &#9776;
        </button>
      )}

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        {chatsLoading ? (
          <div className="text-center mt-5" style={{ color: "#aaa" }}>
            <div
              className="spinner-border text-light"
              role="status"
              style={{ width: "2.5rem", height: "2.5rem" }}
            ></div>
            <p className="mt-3">Loading chats...</p>
          </div>
        ) : (
          myChats.map((item, index) => (
            <React.Fragment key={index}>
              <div
                style={{
                  maxWidth: "75%",
                  padding: "14px 20px",
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, #202123, #2a2b2e)",
                  alignSelf: "flex-end",
                  wordBreak: "break-word",
                  boxShadow: "0px 3px 8px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px"
                }}
              >
                <CgProfile style={{ fontSize: "22px", marginTop: "2px" }} />
                <p style={{ margin: 0 }}>{item.query}</p>
              </div>

              <div
                style={{
                  maxWidth: "75%",
                  padding: "14px 20px",
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, #3b3c48, #55576a)",
                  alignSelf: "flex-start",
                  wordBreak: "break-word",
                  boxShadow: "0px 3px 8px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px"
                }}
              >
                <BsRobot style={{ fontSize: "22px", marginTop: "2px" }} />
                <p style={{ margin: 0 }}>{item.answer}</p>
              </div>
            </React.Fragment>
          ))
        )}

        {paginationLoading && (
          <p style={{ color: "#888", textAlign: "center", fontSize: "14px" }}>
            Loading more...
          </p>
        )}
      </div>

      {showScrollButton && (
        <button
          onClick={() =>
            chatContainerRef.current?.scrollTo({
              top: chatContainerRef.current.scrollHeight,
              behavior: "smooth"
            })
          }
          style={{
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#10a37f",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
            cursor: "pointer",
            zIndex: 1000
          }}
          title="Scroll to bottom"
        >
          <IoIosArrowDown style={{ fontSize: "32px", color: "#fff" }} />
        </button>
      )}

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
          backgroundColor: "#1e1f24"
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
            padding: "12px 18px",
            fontSize: "16px",
            backgroundColor: "#2b2c31",
            color: "white",
            outline: "none",
            lineHeight: "1.5",
            maxHeight: "150px",
            boxShadow: "inset 0px 1px 3px rgba(0,0,0,0.2)"
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            marginLeft: "12px",
            backgroundColor: input.trim() && !loading ? "#10a37f" : "#555",
            border: "none",
            borderRadius: "50%",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "42px",
            height: "42px",
            boxShadow:
              input.trim() && !loading
                ? "0px 0px 8px rgba(16, 163, 127, 0.6)"
                : "none",
            transition: "all 0.3s ease"
          }}
          aria-label="Send message"
        >
          <b>{loading ? "..." : "Send"}</b>
        </button>
      </form>
    </main>
  );
}
