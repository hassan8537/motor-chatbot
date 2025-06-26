import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';

const contacts = [
  { id: 1, name: 'Alice', avatar: 'https://i.pravatar.cc/150?u=alice', status: 'online' },
  { id: 2, name: 'Bob', avatar: 'https://i.pravatar.cc/150?u=bob', status: 'offline' },
  { id: 3, name: 'Charlie', avatar: 'https://i.pravatar.cc/150?u=charlie', status: 'online' },
  { id: 4, name: 'Dave', avatar: 'https://i.pravatar.cc/150?u=dave', status: 'online' }
];

export default function ChatMainPage() {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [messages, setMessages] = useState([
    { sender: 'Alice', text: 'Hey there!', time: '10:00 AM' },
    { sender: 'You', text: 'Hi, Alice!', time: '10:01 AM' }
  ]);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([...messages, { sender: 'You', text, time }]);
  };

  return (
    <div className="d-flex h-100">
      <Sidebar
        contacts={contacts}
        selectedContact={selectedContact}
        onSelectContact={(contact) => {
          setSelectedContact(contact);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
      />
      <ChatWindow
        contact={selectedContact}
        messages={messages}
        onSendMessage={handleSendMessage}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
    </div>
  );
}
