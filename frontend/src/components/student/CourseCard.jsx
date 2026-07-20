import Card from '../common/Card';
import Badge from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import Button from '../common/Button';

function CourseCard({ course, cta = 'View course' }) {
  return (
    <Card
      title={course.title}
      description={course.description}
      action={<Badge>{course.level}</Badge>}
    >
      <div className="section-stack">
        <div className="inline-filters">
          <Badge tone="success">{course.category}</Badge>
          <Badge>{course.lessons} lessons</Badge>
          <Badge>{course.duration}</Badge>
        </div>
        <div>
          <div className="page-subtitle" style={{ margin: '0 0 10px' }}>
            {course.instructor} - {course.students.toLocaleString()} learners
          </div>
          <ProgressBar value={course.progress} />
        </div>
        <Button>{cta}</Button>
      </div>
    </Card>
  );
}

export default CourseCard;
