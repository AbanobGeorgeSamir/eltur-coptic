const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    score: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    answers: { type: [Number], required: true },
    // New attempts are uniquely indexed while legacy attempts remain readable.
    singleAttempt: { type: Boolean, default: true, select: false },
    submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

quizAttemptSchema.index(
    { quiz: 1, student: 1 },
    {
        unique: true,
        name: 'one_attempt_per_student_quiz',
        partialFilterExpression: { singleAttempt: true },
    },
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
