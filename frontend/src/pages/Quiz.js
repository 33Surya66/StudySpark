import React, { useState } from 'react';
import './Quiz.css';

const Quiz = () => {
    const [quizData, setQuizData] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [score, setScore] = useState(0);
    const [topic, setTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [quizComplete, setQuizComplete] = useState(false);
    const [answered, setAnswered] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);

    const handleTopicChange = (e) => setTopic(e.target.value);
    const handleNumQuestionsChange = (e) => setNumQuestions(Number(e.target.value));

    const fetchQuizData = async () => {
        if (!topic || numQuestions < 1) {
            setError('Please enter a valid topic and number of questions.');
            return;
        }

        setLoading(true);
        setError(null);
        setQuizData([]);
        setCurrentQuestion(0);
        setScore(0);
        setQuizComplete(false);
        setAnswered(false);
        setGenerationProgress(10); // Start progress

        try {
            // Simulate progress while waiting for API
            const progressInterval = setInterval(() => {
                setGenerationProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 1000);

            const response = await fetch('https://studyspark-ncsp.onrender.com/api/generate-quiz', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ topic, numQuestions })
            });
            
            clearInterval(progressInterval);
            setGenerationProgress(100);
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.details || `Error: ${response.statusText}`);
            }
            
            if (!data.quiz || data.quiz.length === 0) {
                throw new Error('No quiz questions were generated. Please try again.');
            }
            
            setQuizData(data.quiz);
        } catch (error) {
            console.error('Quiz fetch error:', error);
            setError(`Failed to load quiz data: ${error.message}`);
        } finally {
            setLoading(false);
            setGenerationProgress(0);
        }
    };

    const handleAnswer = (option) => {
        if (answered) return; // Prevent multiple answers
        
        setSelectedAnswer(option);
        setAnswered(true);
        
        if (option === quizData[currentQuestion].answer) {
            setScore(score + 1);
        }
    };

    const nextQuestion = () => {
        if (currentQuestion < quizData.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(null);
            setAnswered(false);
        } else {
            setQuizComplete(true);
        }
    };

    const restartQuiz = () => {
        setQuizData([]);
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setScore(0);
        setTopic('');
        setNumQuestions(5);
        setQuizComplete(false);
        setAnswered(false);
    };

    const getScoreMessage = () => {
        const percentage = (score / quizData.length) * 100;
        if (percentage >= 90) return "Excellent! You're a master of this topic!";
        if (percentage >= 70) return "Great job! You have a solid understanding.";
        if (percentage >= 50) return "Good effort! Keep studying to improve.";
        return "Keep practicing! You'll get better with more study.";
    };

    return (
        <div className="quiz-container">
            <h2>Quiz Generator</h2>

            {!quizData.length && (
                <div className="quiz-settings">
                    <div className="form-group">
                        <label htmlFor="topic">Topic:</label>
                        <input 
                            id="topic"
                            type="text" 
                            value={topic} 
                            onChange={handleTopicChange} 
                            placeholder="e.g., Data Science" 
                            disabled={loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="numQuestions">Number of Questions:</label>
                        <input 
                            id="numQuestions"
                            type="number" 
                            value={numQuestions} 
                            onChange={handleNumQuestionsChange} 
                            min="1" 
                            max="20" 
                            disabled={loading}
                        />
                    </div>
                    
                    <button 
                        onClick={fetchQuizData} 
                        disabled={loading || !topic}
                        className="generate-btn"
                    >
                        {loading ? 'Generating Quiz...' : 'Start Quiz'}
                    </button>
                    
                    {generationProgress > 0 && (
                        <div className="progress-container">
                            <div 
                                className="progress-bar" 
                                style={{width: `${generationProgress}%`}}
                            ></div>
                            <span>Generating questions...</span>
                        </div>
                    )}
                    
                    {error && <p className="error-message">{error}</p>}
                </div>
            )}

            {!quizComplete && quizData.length > 0 && (
                <div className="quiz-question">
                    <div className="question-header">
                        <span className="question-counter">Question {currentQuestion + 1} of {quizData.length}</span>
                        <span className="score-counter">Score: {score}</span>
                    </div>
                    
                    <h3>{quizData[currentQuestion].question}</h3>
                    
                    <div className="quiz-options">
                        {quizData[currentQuestion].options.map((option, index) => (
                            <button
                                key={index}
                                className={`option 
                                    ${selectedAnswer === option && option === quizData[currentQuestion].answer ? 'correct' : ''}
                                    ${selectedAnswer === option && option !== quizData[currentQuestion].answer ? 'wrong' : ''}
                                    ${answered && option === quizData[currentQuestion].answer ? 'correct' : ''}
                                    ${answered && selectedAnswer !== option ? 'disabled' : ''}
                                `}
                                onClick={() => handleAnswer(option)}
                                disabled={answered}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    
                    {answered && (
                        <div className="feedback">
                            {selectedAnswer === quizData[currentQuestion].answer ? (
                                <p className="correct-feedback">Correct!</p>
                            ) : (
                                <p className="incorrect-feedback">
                                    Incorrect. The correct answer is: {quizData[currentQuestion].answer}
                                </p>
                            )}
                        </div>
                    )}
                    
                    <button 
                        onClick={nextQuestion} 
                        disabled={!answered} 
                        className="next-btn"
                    >
                        {currentQuestion < quizData.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    </button>
                </div>
            )}

            {quizComplete && (
                <div className="quiz-results">
                    <h3>Quiz Completed!</h3>
                    <p className="final-score">Your Score: {score} / {quizData.length}</p>
                    <p className="score-message">{getScoreMessage()}</p>
                    <div className="result-actions">
                        <button onClick={restartQuiz} className="restart-btn">New Quiz</button>
                        <button onClick={() => {
                            setQuizComplete(false);
                            setCurrentQuestion(0);
                            setSelectedAnswer(null);
                            setAnswered(false);
                            setScore(0);
                        }} className="retry-btn">Retry This Quiz</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Quiz;
