import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { getSocketUrl } from '../../config/api';
import './ChatRoom.css';

const ChatRoom = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Initialize socket connection with auth token
    socketRef.current = io(getSocketUrl(), {
      auth: { token }
    });

    // Get current user info
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('https://studyspark-ncsp.onrender.com/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Current user data:', response.data);
        setCurrentUser(response.data.user);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        navigate('/login');
      }
    };

    fetchCurrentUser();

    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`https://studyspark-ncsp.onrender.com/api/studyrooms/${roomId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Fetched messages:', response.data);
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Join the room
    socketRef.current.emit('joinRoom', { roomId });

    // Listen for new messages
    socketRef.current.on('newMessage', (message) => {
      console.log('New message received:', message);
      setMessages(prevMessages => [...prevMessages, message]);
    });

    // Listen for errors
    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveRoom', { roomId });
        socketRef.current.disconnect();
      }
    };
  }, [roomId, navigate]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      await axios.post(
        `https://studyspark-ncsp.onrender.com/api/studyrooms/${roomId}/sendMessage`,
        { text: newMessage },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const goBack = () => {
    navigate('/studyrooms');
  };

  // Function to determine if a message is from the current user
  const isCurrentUserMessage = (msg) => {
    if (!currentUser || !msg.sender) return false;
    
    const senderId = msg.sender._id || msg.sender;
    const currentUserId = currentUser.id || currentUser._id;
    
    return senderId.toString() === currentUserId.toString();
  };

  return (
    <div className='container-chat'>
      <div className="chat-room">
      <button className="back-button" onClick={goBack}>
            &larr; Back to Study Rooms
          </button>
        <div className="chat-header">
          
          <h2>Chat Room</h2>
        </div>
        
        <div className="messages">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${isCurrentUserMessage(msg) ? 'sent' : 'received'}`}
            >
              <div className="message-info">
                {isCurrentUserMessage(msg) ? 'You' : (msg.sender?.username || 'Unknown')}
              </div>
              <div className="message-content">{msg.text}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <form className="message-input" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;