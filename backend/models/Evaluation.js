const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  studentName: {
    type: String,
    required: true
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  // Evaluation Criteria
  timelySubmission: {
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 2 },
    comments: String
  },
  dbmsAssociation: {
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 5 },
    comments: String,
    implementation: String // Description of DBMS features implemented
  },
  dataWarehouseAssociation: {
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 5 },
    comments: String,
    implementation: String // Description of Data Warehouse features
  },
  indexingAssociation: {
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 4 },
    comments: String,
    implementation: String // Description of indexing features
  },
  documentation: {
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 2 },
    comments: String
  },
  plagiarismCheck: {
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 2 },
    plagiarismPercentage: { type: Number, default: 0 },
    aiGeneratedPercentage: { type: Number, default: 0 },
    comments: String
  },
  totalScore: {
    type: Number,
    default: 0
  },
  scaledScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'evaluated', 'submitted'],
    default: 'pending'
  },
  evaluatorComments: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total score and scaled score
evaluationSchema.methods.calculateScores = function() {
  const total = 
    this.timelySubmission.score +
    this.dbmsAssociation.score +
    this.dataWarehouseAssociation.score +
    this.indexingAssociation.score +
    this.documentation.score +
    this.plagiarismCheck.score;
  
  this.totalScore = total;
  this.scaledScore = (total / 20) * 10; // Scale down to 10 marks
  return this;
};

// Check if submission is on time
evaluationSchema.methods.checkTimelySubmission = function() {
  const now = new Date();
  const submissionTime = new Date(this.submissionDate);
  const dueTime = new Date(this.dueDate);
  
  const daysLate = Math.ceil((submissionTime - dueTime) / (1000 * 60 * 60 * 24));
  
  if (daysLate <= 0) {
    this.timelySubmission.score = 2;
    this.timelySubmission.comments = "Submitted on time";
  } else if (daysLate === 1) {
    this.timelySubmission.score = 1;
    this.timelySubmission.comments = "Submitted 1 day late";
  } else {
    this.timelySubmission.score = 0;
    this.timelySubmission.comments = `Submitted ${daysLate} days late`;
  }
  
  return this;
};

module.exports = mongoose.model('Evaluation', evaluationSchema); 