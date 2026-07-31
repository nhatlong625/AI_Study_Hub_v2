// Mock data còn lại duy nhất cho AdminQuestionReviewQueuePage.
// Xóa nốt file này khi trang review queue nối được API thật.

export const practiceReviewQueueMock = [
  { id: 'Q-1042', course: 'BIOLOGY 101 – MIDTERM PREP', time: 'Generated 2h ago', flag: 'Low Confidence', flagScore: 45, question: 'What is the primary function of the mitochondria in a eukaryotic cell?', aiAnswer: 'The mitochondria is responsible for storing genetic information and controlling cell division.', flagNote: 'Flag: Likely hallucination. Conflicts with standard biological definitions.', type: 'low', status: 'Pending' },
  { id: 'Q-0891', course: 'US HISTORY – AP PRACTICE', time: 'Reported 5h ago', flag: 'User Reported', question: 'Which president signed the Emancipation Proclamation?', currentAnswer: 'George Washington', userReport: { student: 'student_99', text: '"This is completely wrong. It was Abraham Lincoln."' }, type: 'reported', status: 'Pending' },
  { id: 'Q-0774', course: 'CALCULUS II – FINAL PREP', time: 'Generated 4h ago', flag: 'Low Confidence', flagScore: 38, question: 'What is the integral of sin(x)?', aiAnswer: 'The integral of sin(x) is cos(x) + C.', flagNote: 'Flag: Sign error detected. Expected –cos(x) + C.', type: 'low', status: 'Pending' },
];

// Alias giữ tương thích với AdminQuestionReviewQueuePage.
export const reviewQueue = practiceReviewQueueMock;
