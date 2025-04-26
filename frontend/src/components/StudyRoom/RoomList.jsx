import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RoomList.css';

const RoomList = () => {
    const [joinedRooms, setJoinedRooms] = useState([]);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchJoinedRooms = async () => {
            try {
                const response = await axios.get('https://studyspark-ncsp.onrender.com/api/studyrooms/joined', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setJoinedRooms(response.data);
            } catch (err) {
                console.error('Error fetching joined rooms:', err);
            }
        };
        fetchJoinedRooms();
    }, [token]);

    const handleGoToChatRoom = (roomId) => {
        navigate(`/chat-room/${roomId}`);
    };

    const handleEditTopic = async (roomId, newTopic) => {
        try {
            const response = await axios.patch(
                `https://studyspark-ncsp.onrender.com/api/studyrooms/${roomId}/edit-topic`,
                { topic: newTopic },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setJoinedRooms((prevRooms) =>
                prevRooms.map((room) =>
                    room._id === roomId ? { ...room, topic: response.data.room.topic } : room
                )
            );
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setMessage('Unauthorized: Only the creator can edit this room');
            } else {
                console.error('Error updating topic:', err);
            }
        }
    };

    const handleDeleteRoom = async (roomId) => {
        try {
            await axios.delete(`https://studyspark-ncsp.onrender.com/api/studyrooms/${roomId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setJoinedRooms((prevRooms) => prevRooms.filter((room) => room._id !== roomId));
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setMessage('Unauthorized: Only the creator can delete this room');
            } else {
                console.error('Error deleting room:', err);
            }
        }
    };

    return (
        <div className="room-list">
            <h2>Your Joined Study Rooms</h2>
            {message && <p className="error-message">{message}</p>}
            {joinedRooms.length === 0 ? (
                <p className='room-list-text'>No joined rooms available. Join a room to start collaborating!</p>
            ) : (
                <div className="room-cards">
                    {joinedRooms.map((room) => (
                        <div key={room._id} className="room-card">
                            <h3>{room.name}</h3>
                            <p><strong>Topic:</strong> {room.topic}</p>
                            <button onClick={() => handleGoToChatRoom(room._id)} className="chat-button">
                                Go to Chat Room
                            </button>
                            <button onClick={() => handleEditTopic(room._id, prompt("Enter new topic:"))} className="edit-button">
                                Edit Topic
                            </button>
                            <button onClick={() => handleDeleteRoom(room._id)} className="delete-button">
                                Delete Room
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RoomList;
