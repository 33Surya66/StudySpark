import React, { useState, useEffect } from 'react';
import './Flashcards.css';
import { FaArrowLeft, FaArrowRight, FaSync, FaLightbulb } from 'react-icons/fa';

const Flashcards = () => {
    const [flashcardData, setFlashcardData] = useState([]);
    const [currentCard, setCurrentCard] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [numQuestions, setNumQuestions] = useState(5);
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isChangingCard, setIsChangingCard] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Reset flipped state when changing cards
    useEffect(() => {
        setFlipped(false);
    }, [currentCard]);

    const handleTopicChange = (event) => {
        setTopic(event.target.value);
    };

    const handleQuestionChange = (event) => {
        setNumQuestions(Math.min(20, Math.max(1, event.target.value)));
    };

    const fetchTriviaData = async () => {
        if (!topic) {
            setError('Please enter a topic to generate flashcards.');
            return;
        }

        setLoading(true);
        setError(null);
        setLoadingProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + 10;
            });
        }, 500);

        try {
            const response = await fetch('https://studyspark-ncsp.onrender.com/api/generate-flashcard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ topic, numQuestions }),
            });

            clearInterval(progressInterval);
            setLoadingProgress(100);

            if (!response.ok) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const data = await response.json();
            setFlashcardData(data.flashcards);
            setCurrentCard(0);
            setFlipped(false);
        } catch (err) {
            console.error('Error fetching flashcard data:', err);
            setError('Failed to load flashcards. Please try again.');
        } finally {
            setTimeout(() => {
                setLoading(false);
                setLoadingProgress(0);
            }, 500);
        }
    };

    const nextCard = () => {
        if (isChangingCard) return;
        
        setIsChangingCard(true);
        setTimeout(() => {
            setFlipped(false);
            setCurrentCard((prevCard) => (prevCard + 1) % flashcardData.length);
            setIsChangingCard(false);
        }, 300);
    };

    const prevCard = () => {
        if (isChangingCard) return;
        
        setIsChangingCard(true);
        setTimeout(() => {
            setFlipped(false);
            setCurrentCard((prevCard) => (prevCard - 1 + flashcardData.length) % flashcardData.length);
            setIsChangingCard(false);
        }, 300);
    };

    const flipCard = () => {
        if (!isChangingCard) {
            setFlipped(!flipped);
        }
    };

    const resetCards = () => {
        setCurrentCard(0);
        setFlipped(false);
    };

    return (
        <div className="flashcards-container">
            <h2 className="flashcards-title">Flashcard Generator</h2>
            
            <div className="flashcards-form">
                <div className="form-group">
                    <label htmlFor="topic">Topic:</label>
                    <input
                        type="text"
                        id="topic"
                        value={topic}
                        onChange={handleTopicChange}
                        placeholder="e.g., Quantum Physics, World History"
                        disabled={loading}
                        className="form-input"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="numQuestions">Number of cards:</label>
                    <input
                        type="number"
                        id="numQuestions"
                        value={numQuestions}
                        min="1"
                        max="20"
                        onChange={handleQuestionChange}
                        disabled={loading}
                        className="form-input number-input"
                    />
                </div>

                <button
                    className="generate-button"
                    onClick={fetchTriviaData}
                    disabled={loading || !topic}
                >
                    {loading ? 'Generating...' : 'Generate Flashcards'}
                </button>
                
                {loading && (
                    <div className="progress-container">
                        <div 
                            className="progress-bar" 
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                        <span className="progress-text">Generating your flashcards...</span>
                    </div>
                )}
                
                {error && <p className="error-message">{error}</p>}
            </div>

            {flashcardData.length > 0 && (
                <div className="flashcard-display">
                    <div 
                        className={`flashcard ${flipped ? 'flipped' : ''} ${isChangingCard ? 'changing' : ''}`} 
                        onClick={flipCard}
                    >
                        <div className="flashcard-inner">
                            <div className="flashcard-front">
                                <div className="card-content">
                                    <p className="flashcard-text">{flashcardData[currentCard].question}</p>
                                    <div className="flip-hint">
                                        <FaSync /> Click to reveal answer
                                    </div>
                                </div>
                            </div>
                            <div className="flashcard-back">
                                <div className="card-content">
                                    <p className="flashcard-text">{flashcardData[currentCard].answer}</p>
                                    <div className="flip-hint">
                                        <FaSync /> Click to see question
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flashcard-navigation">
                        <button
                            className="nav-button prev-button"
                            onClick={prevCard}
                            disabled={isChangingCard}
                            title="Previous Card"
                        >
                            <FaArrowLeft />
                        </button>
                        
                        <div className="card-progress">
                            <span>{currentCard + 1}</span> / {flashcardData.length}
                        </div>
                        
                        <button
                            className="nav-button next-button"
                            onClick={nextCard}
                            disabled={isChangingCard}
                            title="Next Card"
                        >
                            <FaArrowRight />
                        </button>
                    </div>
                    
                    {flashcardData.length > 1 && (
                        <button 
                            className="reset-button" 
                            onClick={resetCards}
                            title="Back to First Card"
                        >
                            <FaLightbulb /> Start Over
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Flashcards;
