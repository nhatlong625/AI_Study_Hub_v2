// Mock data cho các trang Admin — shape khớp với response thật của backend sau này.
// Khi có API thật, chỉ cần sửa các hàm trong services/adminService.js để fetch thật,
// không cần đổi gì ở các page.

export const dashboardMock = {
  stats: {
    totalUsers: 8386,
    newUsersThisMonth: 1412,
    totalRevenue: 142500,
    plusRevenue: 45000,
    proRevenue: 85500,
    totalDocuments: 2412000,
    totalSizeMb: 18420.5,
    approvedDocuments: 2280000,
    pendingDocuments: 132000,
    totalPracticeTests: 1126,
    pendingReviews: 24,
  },
  planDistribution: [
    { plan: 'Basic', total: 3774, percent: 45 },
    { plan: 'Plus', total: 2935, percent: 35 },
    { plan: 'Pro', total: 1677, percent: 20 },
  ],
  recentDocuments: [
    { title: 'Advanced Calculus Notes.pdf', user: 'Sarah Miller', time: '2m ago', status: 'Approved' },
    { title: 'History Essay.docx', user: 'John Davis', time: '15m ago', status: 'Pending' },
    { title: 'Organic Chemistry Summary.pdf', user: 'Elena Lopez', time: '1h ago', status: 'Approved' },
    { title: 'Macroeconomics Slides.pptx', user: 'Anna Kim', time: '3h ago', status: 'Approved' },
    { title: 'Statistics Practice Set.pdf', user: 'Lucy White', time: '5h ago', status: 'Pending' },
  ],
};

export const usersMock = [
  { id: 'U-1001', name: 'Sarah Miller', email: 'sarah.miller@studyhub.com', role: 'User', plan: 'Pro', folders: 12, tests: 34, type: 'initials', initials: 'SM', color: '#DBEAFE', textColor: '#1D4ED8', lastLogin: 'Jun 19, 2026, 8:14 AM', location: 'Austin, TX, USA', latestAction: 'Uploaded "Advanced Calculus Notes.pdf" to Calculus I folder', actionTime: '2h ago' },
  { id: 'U-1002', name: 'John Davis', email: 'john.davis@studyhub.com', role: 'User', plan: 'Plus', folders: 6, tests: 18, type: 'initials', initials: 'JD', color: '#FEF3C7', textColor: '#B45309', lastLogin: 'Jun 18, 2026, 6:42 PM', location: 'Toronto, ON, Canada', latestAction: 'Completed "History Essay" practice test with 88% score', actionTime: '15h ago' },
  { id: 'U-1003', name: 'Elena Lopez', email: 'elena.lopez@studyhub.com', role: 'Moderator', plan: 'Pro', folders: 21, tests: 52, type: 'initials', initials: 'EL', color: '#FCE7F3', textColor: '#BE185D', lastLogin: 'Jun 19, 2026, 9:01 AM', location: 'Madrid, Spain', latestAction: 'Approved 3 flagged documents in moderation queue', actionTime: '1h ago' },
  { id: 'U-1004', name: 'Anna Kim', email: 'anna.kim@studyhub.com', role: 'User', plan: 'Basic', folders: 3, tests: 7, type: 'initials', initials: 'AK', color: '#D1FAE5', textColor: '#047857', lastLogin: 'Jun 17, 2026, 11:20 AM', location: 'Seoul, South Korea', latestAction: 'Asked AI Tutor about macroeconomics summary', actionTime: '2d ago' },
  { id: 'U-1005', name: 'Lucy White', email: 'lucy.white@studyhub.com', role: 'User', plan: 'Plus', folders: 9, tests: 22, type: 'initials', initials: 'LW', color: '#F3E8FF', textColor: '#7C3AED', lastLogin: 'Jun 19, 2026, 7:05 AM', location: 'London, UK', latestAction: 'Generated a new practice test for Statistics', actionTime: '3h ago' },
  { id: 'U-1006', name: 'Marcus Lin', email: 'marcus.lin@studyhub.com', role: 'User', plan: 'Basic', folders: 4, tests: 11, type: 'initials', initials: 'ML', color: '#FFE4E6', textColor: '#BE123C', lastLogin: 'Jun 16, 2026, 4:30 PM', location: 'Singapore', latestAction: 'Uploaded "Data Structures Cheat Sheet.pdf"', actionTime: '3d ago' },
  { id: 'U-1007', name: 'Naomi Reed', email: 'naomi.reed@studyhub.com', role: 'Admin', plan: 'Pro', folders: 30, tests: 64, type: 'initials', initials: 'NR', color: '#E0E7FF', textColor: '#4338CA', lastLogin: 'Jun 19, 2026, 9:30 AM', location: 'San Francisco, CA, USA', latestAction: 'Reviewed and resolved 2 items in practice review queue', actionTime: '45m ago' },
  { id: 'U-1008', name: 'Ibrahim Noor', email: 'ibrahim.noor@studyhub.com', role: 'User', plan: 'Plus', folders: 8, tests: 19, type: 'initials', initials: 'IN', color: '#FEF9C3', textColor: '#A16207', lastLogin: 'Jun 15, 2026, 2:10 PM', location: 'Dubai, UAE', latestAction: 'Upgraded subscription to Plus plan', actionTime: '4d ago' },
  { id: 'U-1009', name: 'Sofia Russo', email: 'sofia.russo@studyhub.com', role: 'User', plan: 'Basic', folders: 2, tests: 5, type: 'initials', initials: 'SR', color: '#CFFAFE', textColor: '#0E7490', lastLogin: 'Jun 14, 2026, 9:55 AM', location: 'Milan, Italy', latestAction: 'Created a new folder "Biology Notes"', actionTime: '5d ago' },
  { id: 'U-1010', name: 'Tom Becker', email: 'tom.becker@studyhub.com', role: 'User', plan: 'Pro', folders: 17, tests: 41, type: 'initials', initials: 'TB', color: '#E2E8F0', textColor: '#334155', lastLogin: 'Jun 19, 2026, 8:48 AM', location: 'Berlin, Germany', latestAction: 'Completed "OS Scheduling" practice test with 95% score', actionTime: '1h ago' },
  { id: 'U-1011', name: 'Priya Shah', email: 'priya.shah@studyhub.com', role: 'Moderator', plan: 'Plus', folders: 14, tests: 29, type: 'initials', initials: 'PS', color: '#FBCFE8', textColor: '#9D174D', lastLogin: 'Jun 18, 2026, 5:15 PM', location: 'Mumbai, India', latestAction: 'Flagged a document for copyright review', actionTime: '16h ago' },
  { id: 'U-1012', name: 'Daniel Wu', email: 'daniel.wu@studyhub.com', role: 'User', plan: 'Basic', folders: 1, tests: 3, type: 'initials', initials: 'DW', color: '#DDD6FE', textColor: '#5B21B6', lastLogin: 'Jun 10, 2026, 1:00 PM', location: 'Vancouver, BC, Canada', latestAction: 'Signed up and uploaded first document', actionTime: '9d ago' },
  { id: 'U-1013', name: 'Grace Park', email: 'grace.park@studyhub.com', role: 'User', plan: 'Pro', folders: 22, tests: 48, type: 'initials', initials: 'GP', color: '#BBF7D0', textColor: '#15803D', lastLogin: 'Jun 19, 2026, 7:50 AM', location: 'Sydney, Australia', latestAction: 'Shared "Database Systems" folder with study group', actionTime: '3h ago' },
];

export const librarySemestersMock = [
  {
    id: 1, name: 'Spring 2024', range: 'Jan – May', courses: 8, docs: 169, storage: '320 MB', status: 'ACTIVE',
    startDate: '15/01/2024', endDate: '30/05/2024', description: 'Standard Spring term encompassing core curriculum and undergraduate electives.',
    courseList: [
      { id: 1, name: 'Introduction to Algorithms', code: 'CS-101', instructor: 'Dr. Alan Turing', docs: 24, updated: 'Oct 24, 2023', status: 'Active', icon: 'code', color: '#e0e7ff', iconColor: '#4648D4' },
      { id: 2, name: 'Advanced Calculus', code: 'MATH-302', instructor: 'Prof. Isaac Newton', docs: 18, updated: 'Oct 22, 2023', status: 'Draft', icon: 'calc', color: '#fef3c7', iconColor: '#d97706' },
      { id: 3, name: 'Modern World Literature', code: 'LIT-205', instructor: 'Dr. Virginia Woolf', docs: 42, updated: 'Oct 20, 2023', status: 'Active', icon: 'book', color: '#d1fae5', iconColor: '#059669' },
      { id: 4, name: 'Cellular Biology', code: 'BIO-410', instructor: 'Dr. Rosalind Franklin', docs: 0, updated: 'Oct 18, 2023', status: 'Archived', icon: 'science', color: '#fce7f3', iconColor: '#db2777' },
      { id: 5, name: 'Data Structures', code: 'CS-201', instructor: 'Dr. Ada Lovelace', docs: 30, updated: 'Oct 16, 2023', status: 'Active', icon: 'code', color: '#e0e7ff', iconColor: '#4648D4' },
      { id: 6, name: 'Discrete Mathematics', code: 'MATH-210', instructor: 'Prof. Georg Cantor', docs: 14, updated: 'Oct 14, 2023', status: 'Active', icon: 'calc', color: '#fef3c7', iconColor: '#d97706' },
      { id: 7, name: 'English Composition', code: 'ENG-101', instructor: 'Prof. George Orwell', docs: 22, updated: 'Oct 12, 2023', status: 'Draft', icon: 'book', color: '#d1fae5', iconColor: '#059669' },
      { id: 8, name: 'Physics I', code: 'PHY-101', instructor: 'Dr. Richard Feynman', docs: 19, updated: 'Oct 10, 2023', status: 'Active', icon: 'science', color: '#fce7f3', iconColor: '#db2777' },
    ],
  },
  {
    id: 2, name: 'Summer 2024', range: 'Jun – Aug', courses: 8, docs: 91, storage: '110 MB', status: 'ACTIVE',
    startDate: '01/06/2024', endDate: '31/08/2024', description: '',
    courseList: [
      { id: 1, name: 'Data Structures', code: 'CS-201', instructor: 'Dr. Ada Lovelace', docs: 12, updated: 'Aug 10, 2024', status: 'Active', icon: 'code', color: '#e0e7ff', iconColor: '#4648D4' },
      { id: 2, name: 'Linear Algebra', code: 'MATH-201', instructor: 'Prof. Emmy Noether', docs: 8, updated: 'Aug 08, 2024', status: 'Active', icon: 'calc', color: '#fef3c7', iconColor: '#d97706' },
      { id: 3, name: 'Intro to Philosophy', code: 'PHIL-101', instructor: 'Prof. Immanuel Kant', docs: 10, updated: 'Aug 06, 2024', status: 'Active', icon: 'book', color: '#d1fae5', iconColor: '#059669' },
      { id: 4, name: 'Microbiology', code: 'BIO-210', instructor: 'Dr. Louis Pasteur', docs: 6, updated: 'Aug 04, 2024', status: 'Draft', icon: 'science', color: '#fce7f3', iconColor: '#db2777' },
      { id: 5, name: 'Web Development', code: 'CS-310', instructor: 'Dr. Tim Berners-Lee', docs: 20, updated: 'Aug 02, 2024', status: 'Active', icon: 'code', color: '#e0e7ff', iconColor: '#4648D4' },
      { id: 6, name: 'Statistics I', code: 'STAT-101', instructor: 'Prof. Karl Pearson', docs: 15, updated: 'Jul 30, 2024', status: 'Active', icon: 'calc', color: '#fef3c7', iconColor: '#d97706' },
      { id: 7, name: 'Creative Writing', code: 'ENG-202', instructor: 'Prof. Mark Twain', docs: 9, updated: 'Jul 28, 2024', status: 'Draft', icon: 'book', color: '#d1fae5', iconColor: '#059669' },
      { id: 8, name: 'Chemistry I', code: 'CHEM-101', instructor: 'Dr. Antoine Lavoisier', docs: 11, updated: 'Jul 26, 2024', status: 'Active', icon: 'science', color: '#fce7f3', iconColor: '#db2777' },
    ],
  },
  {
    id: 3, name: 'Fall 2024', range: 'Sep – Dec', courses: 8, docs: 146, storage: '280 MB', status: 'ACTIVE',
    startDate: '01/09/2024', endDate: '20/12/2024', description: '',
    courseList: [
      { id: 1, name: 'Computer Networks', code: 'CS-401', instructor: 'Dr. Vint Cerf', docs: 20, updated: 'Dec 05, 2024', status: 'Active', icon: 'code', color: '#e0e7ff', iconColor: '#4648D4' },
      { id: 2, name: 'Organic Chemistry', code: 'CHEM-301', instructor: 'Dr. Marie Curie', docs: 15, updated: 'Dec 03, 2024', status: 'Active', icon: 'science', color: '#fce7f3', iconColor: '#db2777' },
      { id: 3, name: 'World History', code: 'HIST-101', instructor: 'Prof. Howard Zinn', docs: 30, updated: 'Dec 01, 2024', status: 'Draft', icon: 'book', color: '#d1fae5', iconColor: '#059669' },
      { id: 4, name: 'Calculus III', code: 'MATH-301', instructor: 'Prof. Leonhard Euler', docs: 18, updated: 'Nov 29, 2024', status: 'Active', icon: 'calc', color: '#fef3c7', iconColor: '#d97706' },
      { id: 5, name: 'Operating Systems', code: 'CS-402', instructor: 'Dr. Linus Torvalds', docs: 25, updated: 'Nov 27, 2024', status: 'Active', icon: 'code', color: '#e0e7ff', iconColor: '#4648D4' },
      { id: 6, name: 'Ecology', code: 'BIO-320', instructor: 'Dr. Charles Darwin', docs: 12, updated: 'Nov 25, 2024', status: 'Active', icon: 'science', color: '#fce7f3', iconColor: '#db2777' },
      { id: 7, name: 'American Literature', code: 'LIT-310', instructor: 'Prof. Ernest Hemingway', docs: 16, updated: 'Nov 23, 2024', status: 'Draft', icon: 'book', color: '#d1fae5', iconColor: '#059669' },
      { id: 8, name: 'Probability Theory', code: 'STAT-210', instructor: 'Prof. Pierre-Simon Laplace', docs: 10, updated: 'Nov 21, 2024', status: 'Active', icon: 'calc', color: '#fef3c7', iconColor: '#d97706' },
    ],
  },
];

export const documentsMock = [
  { id: 'D-001', title: 'Advanced Calculus Notes.pdf', type: 'PDF', course: 'Calculus II', semester: 'Semester 2', uploader: { name: 'Sarah Miller', initials: 'SM', color: '#DBEAFE', text: '#1D4ED8' }, uploadedAt: 'Jun 18, 2026, 9:14 AM', size: '4.2 MB', sizeMb: 4.2, status: 'Pending', description: 'Complete lecture notes covering limits, derivatives, and integral applications for Calculus II midterm prep.' },
  { id: 'D-002', title: 'History Essay.docx', type: 'DOCX', course: 'Business Analysis', semester: 'Semester 1', uploader: { name: 'John Davis', initials: 'JD', color: '#FEF3C7', text: '#B45309' }, uploadedAt: 'Jun 17, 2026, 4:30 PM', size: '1.1 MB', sizeMb: 1.1, status: 'Approved', description: 'Essay analyzing the economic impact of post-war reconstruction policies.' },
  { id: 'D-003', title: 'Organic Chemistry Summary.pdf', type: 'PDF', course: 'Artificial Intelligence', semester: 'Semester 3', uploader: { name: 'Elena Lopez', initials: 'EL', color: '#FCE7F3', text: '#BE185D' }, uploadedAt: 'Jun 16, 2026, 11:02 AM', size: '3.6 MB', sizeMb: 3.6, status: 'Approved', description: 'Condensed summary of reaction mechanisms and functional groups for the final exam.' },
  { id: 'D-004', title: 'Macroeconomics Slides.pptx', type: 'PPTX', course: 'Business Analysis', semester: 'Semester 1', uploader: { name: 'Anna Kim', initials: 'AK', color: '#D1FAE5', text: '#047857' }, uploadedAt: 'Jun 15, 2026, 2:45 PM', size: '8.9 MB', sizeMb: 8.9, status: 'Rejected', rejectReason: 'Copyrighted textbook content', description: 'Slide deck covering supply-demand curves and fiscal policy, sourced from a paid textbook.' },
  { id: 'D-005', title: 'Statistics Practice Set.pdf', type: 'PDF', course: 'Database', semester: 'Semester 2', uploader: { name: 'Lucy White', initials: 'LW', color: '#F3E8FF', text: '#7C3AED' }, uploadedAt: 'Jun 14, 2026, 8:00 AM', size: '2.0 MB', sizeMb: 2.0, status: 'Pending', description: 'Practice problems on hypothesis testing and confidence intervals with answer key.' },
  { id: 'D-006', title: 'Data Structures Cheat Sheet.pdf', type: 'PDF', course: 'Software Engineering', semester: 'Semester 2', uploader: { name: 'Marcus Lin', initials: 'ML', color: '#FFE4E6', text: '#BE123C' }, uploadedAt: 'Jun 13, 2026, 6:20 PM', size: '0.8 MB', sizeMb: 0.8, status: 'Approved', description: 'One-page reference for time complexity of common data structures and algorithms.' },
  { id: 'D-007', title: 'OS Scheduling Algorithms.docx', type: 'DOCX', course: 'Software Engineering', semester: 'Semester 3', uploader: { name: 'Naomi Reed', initials: 'NR', color: '#E0E7FF', text: '#4338CA' }, uploadedAt: 'Jun 12, 2026, 10:10 AM', size: '1.4 MB', sizeMb: 1.4, status: 'Pending', description: 'Comparison of round-robin, priority, and multilevel queue scheduling algorithms.' },
  { id: 'D-008', title: 'AI Ethics Lecture Recording.mp4', type: 'MP4', course: 'Artificial Intelligence', semester: 'Semester 3', uploader: { name: 'Grace Park', initials: 'GP', color: '#BBF7D0', text: '#15803D' }, uploadedAt: 'Jun 11, 2026, 3:00 PM', size: '142.5 MB', sizeMb: 142.5, status: 'Approved', description: 'Recorded guest lecture on bias and fairness in machine learning systems.' },
  { id: 'D-009', title: 'Database Normalization.xlsx', type: 'XLSX', course: 'Database', semester: 'Semester 2', uploader: { name: 'Tom Becker', initials: 'TB', color: '#E2E8F0', text: '#334155' }, uploadedAt: 'Jun 10, 2026, 1:35 PM', size: '0.5 MB', sizeMb: 0.5, status: 'Approved', description: 'Worked examples of converting tables to 1NF, 2NF, and 3NF.' },
];

export const practiceTestsMock = [
  { id: 1, name: 'Software Requirement Quiz', subject: 'Software Engineering', docs: 3, questions: 20, creator: { initials: 'AN', name: 'Alex Nguyen', color: '#DBEAFE', text: '#1D4ED8' }, attempts: 128, avg: 82, status: 'Published', createdType: 'AI Generated' },
  { id: 2, name: 'Business Analysis Fundamentals', subject: 'Business Analysis', docs: 2, questions: 30, creator: { initials: 'MT', name: 'Minh Tran', color: '#D1FAE5', text: '#047857' }, attempts: 86, avg: 76, status: 'Pending Review', createdType: 'Manual' },
  { id: 3, name: 'Database Design Test', subject: 'Database', docs: 1, questions: 25, creator: { initials: 'KA', name: 'Kim Anh', color: '#FEF3C7', text: '#B45309' }, attempts: 52, avg: 58, status: 'Flagged', createdType: 'AI Generated' },
  { id: 4, name: 'AI Introduction Quiz', subject: 'Artificial Intelligence', docs: 4, questions: 20, creator: { initials: 'JP', name: 'John Pham', color: '#F3E8FF', text: '#7C3AED' }, attempts: 210, avg: 88, status: 'Published', createdType: 'AI Generated' },
  { id: 5, name: 'Calculus Midterm Prep', subject: 'Calculus II', docs: 2, questions: 15, creator: { initials: 'NR', name: 'Naomi Reed', color: '#E0E7FF', text: '#4338CA' }, attempts: 145, avg: 71, status: 'Published', createdType: 'Manual' },
];

export const practiceReviewQueueMock = [
  { id: 'Q-1042', course: 'BIOLOGY 101 – MIDTERM PREP', time: 'Generated 2h ago', flag: 'Low Confidence', flagScore: 45, question: 'What is the primary function of the mitochondria in a eukaryotic cell?', aiAnswer: 'The mitochondria is responsible for storing genetic information and controlling cell division.', flagNote: 'Flag: Likely hallucination. Conflicts with standard biological definitions.', type: 'low', status: 'Pending' },
  { id: 'Q-0891', course: 'US HISTORY – AP PRACTICE', time: 'Reported 5h ago', flag: 'User Reported', question: 'Which president signed the Emancipation Proclamation?', currentAnswer: 'George Washington', userReport: { student: 'student_99', text: '"This is completely wrong. It was Abraham Lincoln."' }, type: 'reported', status: 'Pending' },
  { id: 'Q-0774', course: 'CALCULUS II – FINAL PREP', time: 'Generated 4h ago', flag: 'Low Confidence', flagScore: 38, question: 'What is the integral of sin(x)?', aiAnswer: 'The integral of sin(x) is cos(x) + C.', flagNote: 'Flag: Sign error detected. Expected –cos(x) + C.', type: 'low', status: 'Pending' },
];

// Alias giữ tương thích với QuestionReviewQueuePage hiện có (ngoài phạm vi 7 trang cần thay).
export const reviewQueue = practiceReviewQueueMock;

export const paymentsMock = {
  stats: {
    totalRevenue: 142500,
    activeSubscriptions: 4612,
    pendingInvoices: 18,
  },
  plans: [
    { plan: 'PLUS', price: 19, billing: 'Monthly' },
    { plan: 'PRO', price: 49, billing: 'Monthly' },
  ],
  members: [
    { id: 'M-001', name: 'Sarah Miller', email: 'sarah.miller@studyhub.com', plan: 'PRO', status: 'Active', billing: 'Monthly', paymentDate: 'Jun 01, 2026', initials: 'SM', avatarBg: '#DBEAFE', avatarColor: '#1D4ED8' },
    { id: 'M-002', name: 'John Davis', email: 'john.davis@studyhub.com', plan: 'PLUS', status: 'Active', billing: 'Yearly', paymentDate: 'May 18, 2026', initials: 'JD', avatarBg: '#FEF3C7', avatarColor: '#B45309' },
    { id: 'M-003', name: 'Elena Lopez', email: 'elena.lopez@studyhub.com', plan: 'PRO', status: 'Active', billing: 'Monthly', paymentDate: 'Jun 05, 2026', initials: 'EL', avatarBg: '#FCE7F3', avatarColor: '#BE185D' },
    { id: 'M-004', name: 'Anna Kim', email: 'anna.kim@studyhub.com', plan: 'PLUS', status: 'Expired', billing: 'Monthly', paymentDate: 'Apr 12, 2026', initials: 'AK', avatarBg: '#D1FAE5', avatarColor: '#047857' },
    { id: 'M-005', name: 'Lucy White', email: 'lucy.white@studyhub.com', plan: 'PRO', status: 'Active', billing: 'Yearly', paymentDate: 'Jun 10, 2026', initials: 'LW', avatarBg: '#F3E8FF', avatarColor: '#7C3AED' },
    { id: 'M-006', name: 'Marcus Lin', email: 'marcus.lin@studyhub.com', plan: 'PLUS', status: 'Active', billing: 'Monthly', paymentDate: 'Jun 03, 2026', initials: 'ML', avatarBg: '#FFE4E6', avatarColor: '#BE123C' },
    { id: 'M-007', name: 'Ibrahim Noor', email: 'ibrahim.noor@studyhub.com', plan: 'PRO', status: 'Active', billing: 'Monthly', paymentDate: 'May 28, 2026', initials: 'IN', avatarBg: '#FEF9C3', avatarColor: '#A16207' },
    { id: 'M-008', name: 'Tom Becker', email: 'tom.becker@studyhub.com', plan: 'PLUS', status: 'Expired', billing: 'Monthly', paymentDate: 'Mar 30, 2026', initials: 'TB', avatarBg: '#E2E8F0', avatarColor: '#334155' },
  ],
};

export const adminSettingsMock = {
  general: {
    siteName: 'AI Study Hub',
    supportEmail: 'support@aistudyhub.com',
    maintenanceMode: false,
  },
  uploadLimits: {
    maxFileSizeMb: 25,
    allowedTypes: ['pdf', 'docx', 'pptx'],
  },
  notifications: {
    emailOnNewUser: true,
    emailOnFlaggedContent: true,
  },
};
