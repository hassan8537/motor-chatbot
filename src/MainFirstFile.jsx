import React, { useState } from "react";
import Cookies from "js-cookie";  // <-- Added this import
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import './App.css';

export default function App() {
  const [chats, setChats] = useState([
    { id: 1, title: "Example Conversation 1", messages: [{ from: "bot", text: "Hi, this is chat 1" }] },
    { id: 2, title: "Example Conversation 2", messages: [{ from: "bot", text: "Hello from chat 2" }] },
  ]);

  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: `New Chat ${chats.length + 1}`,
      messages: [],
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
  };

 
//   const handleSendMessage = async (message) => {
//   // Add user message first
//   setChats((prevChats) =>
//     prevChats.map((chat) => {
//       if (chat.id === activeChatId) {
//         return {
//           ...chat,
//           messages: [...chat.messages, { from: "user", text: message }],
//         };
//       }
//       return chat;
//     })
//   );

//   try {
//     const token = Cookies.get("token");

//     if (!token) {
//       console.error("No auth token found in cookies.");
//       return;
//     }

//     const response = await fetch(
//       "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/qdrant/search",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ query: message }),
//       }
//     );

//     if (!response.ok) {
//       console.error("API error:", response.status, response.statusText);
//       return;
//     }

//     const data = await response.json();
//     console.log("API response data:", data.data.answer);

//     // Adjust this depending on API response structure
//     const botReply = data.answer || data.data?.response || data.message || "Sorry, I don't have an answer.";

//     setChats((prevChats) =>
//       prevChats.map((chat) => {
//         if (chat.id === activeChatId) {
//           return {
//             ...chat,
//             messages: [...chat.messages, { from: "bot", text: botReply }],
//           };
//         }
//         return chat;
//       })
//     );
//   } catch (error) {
//     console.error("Error fetching bot response:", error);
//   }
// };

const handleSendMessage = async (message) => {
  setChats((prevChats) =>
    prevChats.map((chat) => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: [...chat.messages, { from: "user", text: message }],
        };
      }
      return chat;
    })
  );

  try {
    const token = Cookies.get("token");

    if (!token) {
      console.error("No auth token found in cookies.");
      return;
    }

    const response = await fetch(
      "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/qdrant/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: message }),
      }
    );

    if (!response.ok) {
      console.error("API error:", response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log("API response data:", data?.data?.answer);

    const botReply = data?.data?.answer || "Sorry, I don't have an answer.";

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: [...chat.messages, { from: "bot", text: botReply }],
          };
        }
        return chat;
      })
    );
  } catch (error) {
    console.error("Error fetching bot response:", error);
  }
};

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh" }}>
      {sidebarOpen && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          chats={chats}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          activeChatId={activeChatId}
        />
      )}
      <Chat
        onOpenSidebar={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
        chat={activeChat}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
