import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import CourseCard from '../../components/student/CourseCard';
import { semesterApi } from '../../services/libraryApi';

function toCourseCard(subject, semesterName) {
  return {
    id: subject.subjectId,
    title: subject.subjectCode || subject.subjectName,
    description: subject.subjectName,
    level: semesterName,
    category: subject.subjectCode || 'Course',
    lessons: 0,
    duration: 'Library',
    instructor: 'AI Study Hub',
    students: 0,
    progress: 0,
  };
}

function StudentMyCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    semesterApi
      .getAll()
      .then((semesters) => {
        const nextCourses = (Array.isArray(semesters) ? semesters : []).flatMap((semester) =>
          (semester.subjects || []).map((subject) => toCourseCard(subject, semester.semesterName)),
        );
        if (!cancelled) setCourses(nextCourses);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load courses from backend.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="My courses"
        title="Your active learning stack"
        description="Track progress, revisit milestones, and continue the lessons that matter most right now."
      />
      {error && <div className="dm-empty" style={{ color: '#dc2626' }}>{error}</div>}
      <section className="grid-2">
        <Card title="Upcoming milestones" description="Small goals for this week.">
          <div className="dm-empty">No milestones from backend yet.</div>
        </Card>
        <Card title="Weekly focus" description="Progress appears here when backend study activity is available.">
          <div className="dm-empty">No study activity yet.</div>
        </Card>
      </section>
      <section className="course-grid">
        {isLoading ? (
          <div className="dm-empty">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="dm-empty">No courses found.</div>
        ) : (
          courses.slice(0, 3).map((course) => <CourseCard key={course.id} course={course} cta="Continue learning" />)
        )}
      </section>
    </div>
  );
}

export default StudentMyCoursesPage;