import React, { useRef, useState, useEffect, useCallback } from "react";
import { CgProfile } from "react-icons/cg";
import { BsRobot } from "react-icons/bs";
import { IoIosArrowDown } from "react-icons/io";
import Cookies from "js-cookie";
import BASE_URL from "../config";
import ReactMarkdown from "react-markdown";

export default function Chat({ onOpenSidebar, sidebarOpen }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [myChats, setMyChats] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const token = Cookies.get("token");

  // 🔧 Utility function to safely get values from both camelCase and PascalCase
  const safeGet = (obj, camelKey, pascalKey) => {
    if (!obj) return null;
    return obj[camelKey] || obj[pascalKey] || null;
  };

  // 🔧 Utility function to normalize sources array
  const normalizeSources = sources => {
    if (!Array.isArray(sources)) return [];

    return sources.map((source, index) => ({
      FileName:
        safeGet(source, "fileName", "FileName") || `Document ${index + 1}`,
      ChunkIndex: safeGet(source, "chunkIndex", "ChunkIndex") || index,
      Score: safeGet(source, "score", "Score") || "0.00",
    }));
  };

  // 🔧 Utility function to normalize metrics object
  const normalizeMetrics = metrics => {
    if (!metrics || typeof metrics !== "object") return {};

    return {
      TotalRequestTimeMs:
        safeGet(metrics, "totalRequestTimeMs", "TotalRequestTimeMs") || 0,
      Cached: safeGet(metrics, "cached", "Cached") || false,
      EmbeddingFromCache:
        safeGet(metrics, "embeddingFromCache", "EmbeddingFromCache") || false,
      ResultsCount: safeGet(metrics, "resultsCount", "ResultsCount") || 0,
      TokensUsed: safeGet(metrics, "tokensUsed", "TokensUsed") || 0,
    };
  };

  // 🔄 Enhanced fetch chats with proper pagination
  const fetchChats = useCallback(
    async (isPagination = false, resetData = false) => {
      // Prevent multiple simultaneous requests
      if (isPagination && (paginationLoading || !hasMoreChats)) {
        console.log(
          "📝 Skipping pagination request - already loading or no more chats"
        );
        return;
      }

      const url = new URL(`${BASE_URL}/api/v1/chats`);
      url.searchParams.append("limit", "15"); // Increased limit for better UX

      // Add pagination token if loading more
      if (isPagination && nextPageToken) {
        url.searchParams.append("lastKey", nextPageToken);
        console.log("📝 Loading more chats with token:", nextPageToken);
      }

      try {
        if (isPagination) {
          setPaginationLoading(true);
        } else {
          setChatsLoading(true);
          console.log("📝 Loading initial chats...");
        }

        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("📝 API Response:", result);

        // Extract data according to backend structure
        const data = result?.data || {};
        const chats = data?.chats || [];
        const metadata = data?.metadata || {};

        console.log("📝 Extracted chats:", chats.length);
        console.log("📝 Metadata:", metadata);

        // Enhanced normalization with robust case handling
        const normalizedChats = chats.map((chat, index) => {
          console.log(`📝 Processing chat ${index + 1}:`, {
            hasQuery: !!safeGet(chat, "query", "Query"),
            hasAnswer: !!safeGet(chat, "answer", "Answer"),
            hasSources: !!safeGet(chat, "sources", "Sources"),
            hasMetrics: !!safeGet(chat, "metrics", "Metrics"),
            rawSources: safeGet(chat, "sources", "Sources"),
            rawMetrics: safeGet(chat, "metrics", "Metrics"),
          });

          const normalizedSources = normalizeSources(
            safeGet(chat, "sources", "Sources")
          );
          const normalizedMetrics = normalizeMetrics(
            safeGet(chat, "metrics", "Metrics")
          );

          return {
            QueryId:
              safeGet(chat, "queryId", "QueryId") ||
              `chat-${Date.now()}-${Math.random()}`,
            Query: safeGet(chat, "query", "Query") || "",
            Answer: safeGet(chat, "answer", "Answer") || "",
            Sources: normalizedSources,
            Metrics: normalizedMetrics,
            Model: safeGet(chat, "model", "Model") || "",
            Temperature: safeGet(chat, "temperature", "Temperature") || 0,
            TotalTokens: safeGet(chat, "totalTokens", "TotalTokens") || 0,
            CreatedAt:
              safeGet(chat, "timestamp", "CreatedAt") ||
              safeGet(chat, "createdAt", "CreatedAt") ||
              new Date().toISOString(),
          };
        });

        console.log("📝 Normalized chats sample:", normalizedChats[0]);

        // Update state based on operation type
        if (resetData || !isPagination) {
          console.log("📝 Setting initial chats:", normalizedChats.length);
          setMyChats(normalizedChats);
        } else {
          console.log("📝 Appending chats for pagination");
          setMyChats(prevChats => [...prevChats, ...normalizedChats]);
        }

        // Update pagination state
        const newNextPageToken = data.nextPageToken || null;
        const newHasMore = metadata.hasMore || false;

        console.log("📝 Pagination update:", {
          nextPageToken: newNextPageToken,
          hasMore: newHasMore,
          count: metadata.count,
        });

        setNextPageToken(newNextPageToken);
        setHasMoreChats(newHasMore);
      } catch (error) {
        console.error("❌ Fetch chats failed:", error);
        if (!isPagination) {
          setMyChats([]);
          setHasMoreChats(false);
          setNextPageToken(null);
        }
      } finally {
        setChatsLoading(false);
        setPaginationLoading(false);
      }
    },
    [token, paginationLoading, hasMoreChats, nextPageToken]
  );

  // 💬 Enhanced send message
  const sendMessage = async query => {
    try {
      console.log("📤 Sending message:", query);
      const response = await fetch(`${BASE_URL}/api/v1/chats/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("📤 Send message response:", result);
      return result;
    } catch (error) {
      console.error("❌ Send message failed:", error);
      throw error;
    }
  };

  // 🚀 Handle send message with better error handling
  const handleSendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);

    // Create temporary message
    const tempMessage = {
      QueryId: `temp-${Date.now()}`,
      Query: trimmed,
      Answer: "Thinking...",
      isTemporary: true,
      Sources: [],
      Metrics: {},
      CreatedAt: new Date().toISOString(),
    };

    // Add temp message to chat
    setMyChats(prev => [tempMessage, ...prev]);

    try {
      const response = await sendMessage(trimmed);
      const data = response?.data || {};

      // Extract response data with case handling
      const answer = data.answer || "No response received.";
      const rawSources = data.sources || [];
      const rawMetrics = data.metrics || {};

      console.log("📤 Processing response:", {
        answer: answer.length,
        sources: rawSources.length,
        metrics: rawMetrics,
      });

      // Normalize the response data
      const normalizedSources = normalizeSources(rawSources);
      const normalizedMetrics = normalizeMetrics(rawMetrics);

      // Replace temporary message with actual response
      setMyChats(prev => {
        const updated = [...prev];
        const tempIndex = updated.findIndex(chat => chat.isTemporary);

        if (tempIndex !== -1) {
          updated[tempIndex] = {
            QueryId: `chat-${Date.now()}`,
            Query: trimmed,
            Answer: answer,
            Sources: normalizedSources,
            Metrics: normalizedMetrics,
            CreatedAt: new Date().toISOString(),
          };
        }

        return updated;
      });

      // Auto-scroll to latest message
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = 0; // Since we use flex-direction: column-reverse
        }
      }, 100);
    } catch (error) {
      console.error("❌ Message sending error:", error);

      // Replace temp message with error message
      setMyChats(prev => {
        const updated = [...prev];
        const tempIndex = updated.findIndex(chat => chat.isTemporary);

        if (tempIndex !== -1) {
          updated[tempIndex] = {
            QueryId: `error-${Date.now()}`,
            Query: trimmed,
            Answer:
              "Sorry, I encountered an error while processing your request. Please try again.",
            isError: true,
            Sources: [],
            Metrics: {},
            CreatedAt: new Date().toISOString(),
          };
        }

        return updated;
      });
    } finally {
      setInput("");
      setLoading(false);
    }
  };

  // 📜 FIXED: Enhanced scroll handling for infinite scroll
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Store current scroll position
    setScrollPosition(scrollTop);

    // For column-reverse: scrollTop is negative when scrolling up
    // scrollTop = 0 means at the bottom (newest messages)
    // scrollTop becomes more negative as you scroll up (towards older messages)

    // Calculate distance from bottom (newest messages)
    const distanceFromBottom = Math.abs(scrollTop);

    // Show scroll button when user scrolled up from bottom
    setShowScrollButton(distanceFromBottom > 100);

    // Check if we're near the top (oldest messages) for pagination
    // When scrollTop approaches (scrollHeight - clientHeight) in negative value
    const isNearTop = distanceFromBottom >= scrollHeight - clientHeight - 100;

    console.log("📜 Scroll debug:", {
      scrollTop,
      scrollHeight,
      clientHeight,
      distanceFromBottom,
      isNearTop,
      hasMoreChats,
      paginationLoading,
      chatsLoading,
    });

    // Trigger pagination when near top and conditions are met
    if (
      isNearTop &&
      hasMoreChats &&
      !paginationLoading &&
      !chatsLoading &&
      myChats.length > 0
    ) {
      console.log("📜 Triggering pagination load...");

      // Store current scroll height before adding new content
      const currentScrollHeight = scrollHeight;

      fetchChats(true).then(() => {
        // Restore scroll position after new content loads
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const heightDifference = newScrollHeight - currentScrollHeight;

            // Adjust scroll position to maintain visual position
            // Since we're adding content at the "top" (end of array), we need to adjust
            container.scrollTop = scrollTop - heightDifference;

            console.log("📜 Restored scroll position:", {
              oldHeight: currentScrollHeight,
              newHeight: newScrollHeight,
              heightDiff: heightDifference,
              oldScrollTop: scrollTop,
              newScrollTop: container.scrollTop,
            });
          }
        });
      });
    }
  }, [
    hasMoreChats,
    paginationLoading,
    chatsLoading,
    fetchChats,
    myChats.length,
  ]);

  // 🎯 Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // 🔄 Initial load
  useEffect(() => {
    if (token) {
      console.log("🔄 Initial chat load");
      fetchChats(false, true);
    }
  }, [token, fetchChats]);

  // 📏 Format response time
  const formatResponseTime = ms => {
    if (!ms) return "N/A";

    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  // 🔄 New chat handler
  const handleNewChat = useCallback(() => {
    setMyChats([]);
    setNextPageToken(null);
    setHasMoreChats(true);
    setInput("");
    setScrollPosition(0);

    // Refresh chats
    if (token) {
      fetchChats(false, true);
    }
  }, [token, fetchChats]);

  // 🗑️ UPDATED: Handle chat deletion refresh
  const handleChatDeletionRefresh = useCallback(() => {
    console.log("🗑️ Chat deletion detected, refreshing chat list...");

    // Clear current chats and reset pagination
    setMyChats([]);
    setNextPageToken(null);
    setHasMoreChats(true);
    setScrollPosition(0);

    // Refresh chats from server
    if (token) {
      fetchChats(false, true);
    }
  }, [token, fetchChats]);

  // 🌐 UPDATED: Add to window for external access (from sidebar)
  useEffect(() => {
    window.startNewChat = handleNewChat;
    window.refreshChatsAfterDeletion = handleChatDeletionRefresh; // NEW

    return () => {
      delete window.startNewChat;
      delete window.refreshChatsAfterDeletion; // Clean up
    };
  }, [handleNewChat, handleChatDeletionRefresh]);

  // 📡 UPDATED: Listen for custom events from sidebar
  useEffect(() => {
    const handleChatDeletion = event => {
      console.log("🗑️ Received chat deletion event:", event.detail);
      handleChatDeletionRefresh();
    };

    // Listen for custom event from sidebar
    window.addEventListener("chatsDeleted", handleChatDeletion);

    return () => {
      window.removeEventListener("chatsDeleted", handleChatDeletion);
    };
  }, [handleChatDeletionRefresh]);

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        color: "white",
        backgroundColor: "#1e1f24",
        position: "relative",
      }}
    >
      {/* Hamburger menu when sidebar closed */}
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
            zIndex: 10,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.target.style.color = "#10a37f";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={e => {
            e.target.style.color = "white";
            e.target.style.transform = "scale(1)";
          }}
        >
          &#9776;
        </button>
      )}

      {/* Chat container with FIXED infinite scroll */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column-reverse", // Latest messages at top
          gap: "16px",
          scrollBehavior: "smooth",
        }}
      >
        {/* Loading states */}
        {chatsLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "#aaa",
              padding: "40px 20px",
            }}
          >
            <div
              className="spinner-border text-light"
              role="status"
              style={{
                width: "2.5rem",
                height: "2.5rem",
                marginBottom: "16px",
              }}
            />
            <p>Loading your conversation history...</p>
          </div>
        ) : myChats.length === 0 ? (
          // Welcome message
          <div
            style={{
              textAlign: "center",
              color: "#888",
              fontSize: "16px",
              padding: "60px 20px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>🤖</div>
            <h3 style={{ color: "#e1e1e1", marginBottom: "12px" }}>
              Welcome to Atlas AI Assistant!
            </h3>
            <p
              style={{ lineHeight: "1.6", maxWidth: "400px", margin: "0 auto" }}
            >
              Ask me anything about your uploaded documents and I'll help you
              find the answers using advanced AI search.
            </p>
          </div>
        ) : (
          // Chat messages
          <>
            {/* Pagination loading indicator - shown at the END of the array (visually at top due to column-reverse) */}
            {paginationLoading && (
              <div
                style={{
                  textAlign: "center",
                  color: "#888",
                  fontSize: "14px",
                  padding: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  order: 1, // Force it to appear at the visual top
                }}
              >
                <div
                  className="spinner-border text-light"
                  style={{ width: "1.5rem", height: "1.5rem" }}
                />
                Loading more conversations...
              </div>
            )}

            {/* No more chats indicator */}
            {!hasMoreChats && myChats.length > 0 && !chatsLoading && (
              <div
                style={{
                  textAlign: "center",
                  color: "#666",
                  fontSize: "12px",
                  padding: "20px",
                  order: 2, // Show below loading indicator
                }}
              >
                📜 You've reached the beginning of your conversation history
              </div>
            )}

            {myChats.map((item, index) => (
              <React.Fragment key={item.QueryId || index}>
                {/* Bot Response */}
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "16px 20px",
                    borderRadius: "18px",
                    background: item.isError
                      ? "linear-gradient(135deg, #d73027, #fc8d59)"
                      : item.isTemporary
                      ? "linear-gradient(135deg, #4a4b52, #5a5b62)"
                      : "linear-gradient(135deg, #3b3c48, #55576a)",
                    alignSelf: "flex-start",
                    wordBreak: "break-word",
                    boxShadow: "0px 4px 12px rgba(0,0,0,0.3)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    border: item.isTemporary ? "1px solid #666" : "none",
                  }}
                >
                  <BsRobot
                    style={{
                      fontSize: "24px",
                      marginTop: "2px",
                      color: item.isError ? "#fff" : "#e0e0e0",
                      animation: item.isTemporary
                        ? "pulse 1.5s infinite"
                        : "none",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "15px",
                        lineHeight: "1.6",
                        opacity: item.isTemporary ? 0.8 : 1,
                      }}
                    >
                      <ReactMarkdown>
                        {item.Answer || "No answer available."}
                      </ReactMarkdown>
                    </div>

                    {/* Enhanced Sources section with robust data handling */}
                    {Array.isArray(item.Sources) && item.Sources.length > 0 && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "10px",
                          backgroundColor: "rgba(0,0,0,0.2)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#bbb",
                        }}
                      >
                        {/* <strong style={{ color: "#e1e1e1" }}>
                          📚 Sources ({item.Sources.length}):
                        </strong>
                        <ul
                          style={{ margin: "6px 0 0 0", paddingLeft: "16px" }}
                        >
                          {item.Sources.map((source, idx) => (
                            <li key={idx} style={{ marginBottom: "4px" }}>
                              <span
                                style={{ color: "#10a37f", fontWeight: "500" }}
                              >
                                {source.FileName || `Document ${idx + 1}`}
                              </span>{" "}
                              (Section {(source.ChunkIndex || 0) + 1},
                              Relevance: {source.Score || "N/A"})
                            </li>
                          ))}
                        </ul> */}
                      </div>
                    )}

                    {/* Enhanced metrics section with robust data handling */}
                    {item.Metrics &&
                      Object.keys(item.Metrics).length > 0 &&
                      !item.isTemporary && (
                        <div
                          style={{
                            marginTop: "10px",
                            fontSize: "11px",
                            color: "#999",
                            display: "flex",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          {item.Metrics.TotalRequestTimeMs > 0 && (
                            <span>
                              ⏱️{" "}
                              {formatResponseTime(
                                item.Metrics.TotalRequestTimeMs
                              )}
                            </span>
                          )}
                          {item.Metrics.Cached && (
                            <span style={{ color: "#4a90e2" }}>⚡ Cached</span>
                          )}
                          {item.Metrics.EmbeddingFromCache && (
                            <span style={{ color: "#10a37f" }}>
                              🧠 Smart Cache
                            </span>
                          )}
                          {item.Metrics.TokensUsed > 0 && (
                            <span>🔤 {item.Metrics.TokensUsed} tokens</span>
                          )}
                          {item.Metrics.ResultsCount > 0 && (
                            <span>📄 {item.Metrics.ResultsCount} sources</span>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* User Query */}
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "16px 20px",
                    borderRadius: "18px",
                    background: "linear-gradient(135deg, #202123, #2a2b2e)",
                    alignSelf: "flex-end",
                    wordBreak: "break-word",
                    boxShadow: "0px 4px 12px rgba(0,0,0,0.3)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <CgProfile
                    style={{
                      fontSize: "24px",
                      marginTop: "2px",
                      color: "#10a37f",
                    }}
                  />
                  <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.6" }}>
                    {item.Query || ""}
                  </p>
                </div>
              </React.Fragment>
            ))}
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = 0; // Top in column-reverse = latest messages
            }
          }}
          style={{
            position: "fixed",
            bottom: "100px",
            right: "30px",
            backgroundColor: "#10a37f",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(16, 163, 127, 0.4)",
            cursor: "pointer",
            zIndex: 1000,
            transition: "all 0.3s ease",
          }}
          onMouseEnter={e => {
            e.target.style.backgroundColor = "#0d8a6b";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={e => {
            e.target.style.backgroundColor = "#10a37f";
            e.target.style.transform = "scale(1)";
          }}
          title="Scroll to latest messages"
        >
          <IoIosArrowDown
            style={{
              fontSize: "24px",
              color: "#fff",
              transform: "rotate(180deg)",
            }}
          />
        </button>
      )}

      {/* Enhanced input form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        style={{
          display: "flex",
          alignItems: "end",
          padding: "16px",
          borderTop: "1px solid #40414f",
          backgroundColor: "#1e1f24",
          gap: "12px",
        }}
      >
        <textarea
          ref={textareaRef}
          placeholder="Ask me anything about your documents..."
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={1}
          disabled={loading}
          style={{
            flex: 1,
            resize: "none",
            borderRadius: "20px",
            border: "none",
            padding: "14px 20px",
            fontSize: "16px",
            backgroundColor: loading ? "#1a1b1e" : "#2b2c31",
            color: loading ? "#666" : "white",
            outline: "none",
            lineHeight: "1.5",
            maxHeight: "120px",
            minHeight: "50px",
            boxShadow: "inset 0px 2px 4px rgba(0,0,0,0.2)",
            transition: "all 0.2s ease",
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && !loading) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          onFocus={e => {
            if (!loading) {
              e.target.style.backgroundColor = "#343541";
              e.target.style.boxShadow =
                "inset 0px 2px 4px rgba(0,0,0,0.2), 0 0 0 2px #10a37f";
            }
          }}
          onBlur={e => {
            if (!loading) {
              e.target.style.backgroundColor = "#2b2c31";
              e.target.style.boxShadow = "inset 0px 2px 4px rgba(0,0,0,0.2)";
            }
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            backgroundColor: input.trim() && !loading ? "#10a37f" : "#555",
            border: "none",
            borderRadius: "50%",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "50px",
            height: "50px",
            boxShadow:
              input.trim() && !loading
                ? "0px 0px 12px rgba(16, 163, 127, 0.6)"
                : "none",
            transition: "all 0.3s ease",
            fontSize: "18px",
            fontWeight: "bold",
            color: "white",
          }}
          onMouseEnter={e => {
            if (input.trim() && !loading) {
              e.target.style.backgroundColor = "#0d8a6b";
              e.target.style.transform = "scale(1.05)";
            }
          }}
          onMouseLeave={e => {
            if (input.trim() && !loading) {
              e.target.style.backgroundColor = "#10a37f";
              e.target.style.transform = "scale(1)";
            }
          }}
          aria-label="Send message"
        >
          {loading ? (
            <div
              className="spinner-border"
              style={{ width: "20px", height: "20px", borderWidth: "2px" }}
            />
          ) : (
            "→"
          )}
        </button>
      </form>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .spinner-border {
          display: inline-block;
          width: 2rem;
          height: 2rem;
          vertical-align: text-bottom;
          border: 0.25em solid;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spinner-border 0.75s linear infinite;
        }

        @keyframes spinner-border {
          to {
            transform: rotate(360deg);
          }
        }

        .text-light {
          color: #f8f9fa !important;
        }
      `}</style>
    </main>
  );
}
