import { useEffect, useState } from 'react';
import axios from 'axios';
import './JoinRoom.css';

const JoinRoom = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true); // To handle loading state
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await axios.get('https://studyspark-ncsp.onrender.com/api/studyrooms/available', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setRooms(response.data || []); // Safely handle the response data
            } catch (error) {
                setError('Error fetching rooms');
                console.error('Error fetching rooms:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    const handleJoinRoom = async (roomId) => {
        try {
            const response = await axios.post(`https://studyspark-ncsp.onrender.com/api/studyrooms/${roomId}/join`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            alert('Successfully joined the room');
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join the room');
        }
    };

    if (loading) {
        return <div>Loading rooms...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div>
            <h2 className='join-title'>Join a Study Room</h2>
            <div className='room-item'>
                {rooms && rooms.length === 0 ? (
                    <p>No available rooms to join.</p>
                ) : (
                    rooms.map((room) => (
                        <div key={room._id} style={{ marginBottom: '10px' }}>
                            <h3>{room.name}</h3>
                            <p>Topic: {room.topic}</p>
                            <p>Participants: {room.members ? room.members.length : 0}</p>
                            <button onClick={() => handleJoinRoom(room._id)}>
                                Join Room
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default JoinRoom;
