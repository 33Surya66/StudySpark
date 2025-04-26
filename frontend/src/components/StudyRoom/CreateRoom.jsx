import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CreateRoom.css';

const CreateRoom = () => {
  const [roomName, setRoomName] = useState('');
  const [topic, setTopic] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');

    if (!token) {
      alert("You need to be logged in to create a room.");
      return;
    }

    try {
      const response = await axios.post(
        'https://studyspark-ncsp.onrender.com/api/studyrooms/create',
        { name: roomName, topic: topic },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccessMessage("Room created successfully! Redirecting...");

      setRoomName('');
      setTopic('');

      setTimeout(() => {
        navigate('/room-list');  
      }, 1500); 

    } catch (err) {
      console.error('Error creating room:', err);
      alert('Error creating the room');
    }
  };

  return (
    <div className="create-room-form">
      <h2>Create Study Room</h2>
      <form onSubmit={handleCreateRoom}>
        <div className="form-group">
          <label htmlFor="roomName">Room Name</label>
          <input
            type="text"
            id="roomName"
            placeholder="Enter Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="topic">Topic</label>
          <input
            type="text"
            id="topic"
            placeholder="Enter Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <button type="submit">Create Room</button>

        {successMessage && <p className="success-message">{successMessage}</p>}
      </form>
    </div>
  );
};

export default CreateRoom;
