import React, { useState } from "react";
import Cookies from "js-cookie";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import "./App.css";
import BASE_URL from "./config";

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: `Chat ${chats.length + 1}`,
      messages: []
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
  };

  const handleSendMessage = async (message) => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        console.error("No auth token found.");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/v1/qdrant/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: message })
      });

      if (!response.ok) {
        console.error("API error:", response.statusText);
        return;
      }

      const data = await response.json();
      console.log("Bot response:", data);
      return data;
    } catch (error) {
      console.error("Error fetching bot response:", error);
      return {
        from: "bot",
        text: "An error occurred while fetching a response."
      };
    }
  };

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;

  return (
    <div
      className="app-container"
      style={{
        display: "flex",
        height: "100vh",
        background: "#1e1f24",
        overflow: "hidden"
      }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        activeChatId={activeChatId}
      />
      <Chat
        onOpenSidebar={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
        chat={activeChat}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
