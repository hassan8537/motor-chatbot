import React, { useState } from 'react';
import './App.css';

const contacts = [
  { name: 'Alice', avatar: 'https://i.pravatar.cc/150?u=alice' },
  { name: 'Bob', avatar: 'https://i.pravatar.cc/150?u=bob' },
  { name: 'Charlie', avatar: 'https://i.pravatar.cc/150?u=charlie' },
  { name: 'Dave', avatar: 'https://i.pravatar.cc/150?u=dave' }
];

export default function ChatMainPage() {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [messages, setMessages] = useState([
    { sender: 'Alice', text: 'Hey there!' },
    { sender: 'You', text: 'Hi, Alice!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // const sendMessage = () => {
  //   if (!input.trim()) return;
  //   setMessages([...messages, { sender: 'You', text: input }]);
  //   setInput('');
  // };

  const sendMessage = () => {
    if (!input.trim()) return;

    const yourMessage = { sender: 'You', text: input };
    setMessages(prev => [...prev, yourMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const replyMessage = {
        sender: selectedContact.name,
        text: 'Got your message!',
      };
      setMessages(prev => [...prev, replyMessage]);
      setIsTyping(false);
    }, 1500);
  };


  return (
    <div className="container-fluid h-100">
      <div className="row h-100">
        {/* Sidebar */}
        <div className="col-3 bg-dark text-white p-3 d-flex flex-column">
          <h5 className="text-center border-bottom pb-3">Chats</h5>
          <div className="flex-grow-1 overflow-auto">
            {contacts.map(contact => (
              <div
                key={contact.name}
                className={`d-flex align-items-center p-2 mb-2 rounded ${contact.name === selectedContact.name ? 'bg-secondary' : ''
                  }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedContact(contact)}
              >
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="rounded-circle me-2"
                  width="40"
                  height="40"
                />
                <span>{contact.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="col-9 d-flex flex-column p-0 bg-light">
          <div className="p-3 border-bottom d-flex align-items-center bg-white">
            <img
              src={selectedContact.avatar}
              alt={selectedContact.name}
              className="rounded-circle me-2"
              width="40"
              height="40"
            />
            <h6 className="mb-0">{selectedContact.name}</h6>
          </div>

          <div className="flex-grow-1 p-4 overflow-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`d-flex mb-3 ${msg.sender === 'You' ? 'justify-content-end' : ''
                  }`}
              >
                <div
                  className={`p-3 rounded shadow-sm ${msg.sender === 'You'
                      ? 'bg-primary text-white'
                      : 'bg-white text-dark'
                    }`}
                  style={{ maxWidth: '75%' }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="d-flex mb-3">
                <div className="spinner-border text-muted" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}


          </div>

          <div className="p-3 border-top bg-white d-flex">
            <input
              type="text"
              className="form-control me-2"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button className="btn btn-primary" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
