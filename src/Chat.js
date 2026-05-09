import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useHistory } from 'react-router-dom';
import { sendMessage, listenToMessages, uploadFile } from './firebase';
import './Chat.css';

const Chat = () => {
  const { currentUser } = useAuth();
  const history = useHistory();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();

  const chatId = currentUser?.uid ? `${currentUser.uid}_admin` : null;

  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = listenToMessages(chatId, (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });
    return () => unsubscribe();
  }, [chatId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    const text = inputText;
    setInputText('');
    await sendMessage(chatId, currentUser.uid, currentUser.email, text);
  };

  const handleImageClick = () => {
    document.getElementById('chat-image-input').click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    
    setUploading(true);
    try {
      // Use TCP-Style Chunked Protocol
      await sendChunkedMessage(chatId, currentUser.uid, currentUser.email, file);
    } catch (err) {
      console.error("Transfer failed:", err);
    }
    setUploading(false);
  };

  if (!currentUser) {
    return <div className="chat-loading">Please login to access support.</div>;
  }

  return (
    <div className="chat-screen">
      <div className="chat-container glass">
        {/* Header */}
        <div className="chat-header">
          <button className="chat-back" onClick={() => history.goBack()}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="chat-user-info">
            <div className="chat-avatar">S</div>
            <div>
              <h3>SDS Support</h3>
              <span className="online-status">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {(() => {
            const reassembled = [];
            const buffers = {};
            
            messages.forEach(msg => {
              if (msg.type === 'transfer_chunk') {
                if (!buffers[msg.transferId]) buffers[msg.transferId] = [];
                buffers[msg.transferId][msg.chunkIndex] = msg.data;
                return;
              }
              if (msg.type === 'transfer_end') {
                const fullData = buffers[msg.transferId]?.join('') || '';
                reassembled.push({ ...msg, type: 'image_chunked', fileUrl: fullData });
                return;
              }
              if (msg.type !== 'transfer_start') reassembled.push(msg);
            });

            if (reassembled.length === 0) {
              return (
                <div className="chat-empty">
                  <div className="empty-icon">💬</div>
                  <p>Welcome! How can we help you today?</p>
                </div>
              );
            }

            return reassembled.map((msg) => (
              <div 
                key={msg.id} 
                className={`msg-bubble-wrap ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`}
              >
                <div className="msg-bubble">
                  {msg.type === 'image_chunked' || msg.type === 'image' ? (
                    <img src={msg.fileUrl} alt="sent" className="msg-img" />
                  ) : msg.type === 'file' ? (
                    <div className="file-box">
                      <i className="fas fa-file"></i>
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">{msg.fileName || 'File'}</a>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                  <span className="msg-time">
                    {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.senderId === currentUser.uid && (
                      <span className="msg-status">
                        {msg.seen ? ' (Seen)' : ' (Delivered)'}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ));
          })()}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form className="chat-input-area" onSubmit={handleSend}>
          <input 
            type="file" 
            id="chat-image-input" 
            hidden 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          <button 
            type="button" 
            className="chat-action-btn" 
            onClick={handleImageClick}
            disabled={uploading}
          >
            {uploading ? <div className="btn-spinner" /> : <i className="fas fa-image"></i>}
          </button>
          <input 
            type="text" 
            placeholder="Type your message..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;