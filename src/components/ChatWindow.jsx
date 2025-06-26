import React, { useEffect, useRef } from 'react';

export default function ChatWindow({ contact, messages, onSendMessage, onToggleSidebar, isSidebarOpen }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`chat-window d-flex flex-column flex-grow-1 bg-light`}>
      {/* Header */}
      <div className="chat-header d-flex align-items-center border-bottom p-3 bg-white shadow-sm">
        {/* Sidebar toggle button */}
        <button
          className="btn btn-outline-secondary d-md-none me-3"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {/* Hamburger icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-list" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M2.5 12.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0-5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0-5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11z"/>
          </svg>
        </button>

        <img
          src={contact.avatar}
          alt={contact.name}
          className="rounded-circle me-3"
          width={48}
          height={48}
        />
        <div>
          <div className="fw-bold">{contact.name}</div>
          <small className="text-muted">{contact.status}</small>
        </div>
      </div>

      {/* Messages */}
      <div
        className="chat-body flex-grow-1 overflow-auto px-4 py-3"
        style={{ backgroundColor: '#f7f7f7' }}
      >
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'You';
          return (
            <div
              key={idx}
              className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}
            >
              {!isUser && (
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="rounded-circle me-2"
                  width={32}
                  height={32}
                />
              )}

              <div
                className={`px-3 py-2 rounded ${
                  isUser ? 'bg-primary text-white' : 'bg-white text-dark border'
                }`}
                style={{ maxWidth: '65%' }}
              >
                <div>{msg.text}</div>
                <small className="text-muted d-block mt-1" style={{ fontSize: 10 }}>
                  {msg.time}
                </small>
              </div>

              {isUser && (
                <img
                  src="https://i.pravatar.cc/150?u=you"
                  alt="You"
                  className="rounded-circle ms-2"
                  width={32}
                  height={32}
                />
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input border-top p-3 bg-white d-flex align-items-center">
        <input
          type="text"
          className="form-control me-2"
          placeholder="Type your message..."
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSendMessage(e.target.value);
              e.target.value = '';
            }
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => {
            const input = document.querySelector('.chat-input input');
            if(input.value.trim()) {
              onSendMessage(input.value);
              input.value = '';
            }
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
