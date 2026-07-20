import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import { adminService } from '../../services/adminService';
import { reviewQueue as reviewQueueMock } from '../../mocks/adminMock';

function normalizeReviewItem(item) {
  return {
    id: item.id || item.questionId || item.attemptId || item.title,
    title: item.title || item.course || item.question || 'Review item',
    owner: item.owner || item.creator?.name || item.student || item.createdBy || 'AI System',
    flagged: item.flagged || item.flag || item.flagScore || item.status || item.type || 'Pending',
    priority:
      item.priority ||
      (item.type === 'reported' ? 'High' : item.type === 'low' ? 'Medium' : 'Low'),
  };
}

function QuestionReviewQueuePage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminService
      .getPracticeReviewQueue()
      .then((data) => {
        if (!cancelled) setItems((Array.isArray(data) ? data : []).map(normalizeReviewItem));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Backend unavailable. Showing fallback review queue.');
          setItems(reviewQueueMock.map(normalizeReviewItem));
        }
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
      <PageHeader eyebrow="Review queue" title="Question review queue" description="Flagged question sets awaiting moderation." />
      <Card title="Queued reviews" description="Prioritize by severity and owner.">
        {error && <div className="dm-empty" style={{ color: '#dc2626' }}>{error}</div>}
        {isLoading ? (
          <div className="dm-empty">Loading review queue...</div>
        ) : (
          <Table
            columns={['Batch', 'Owner', 'Flagged', 'Priority']}
            data={items}
            renderRow={(item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.owner}</td>
                <td>{item.flagged}</td>
                <td><Badge tone={item.priority === 'High' ? 'danger' : item.priority === 'Medium' ? 'warning' : 'success'}>{item.priority}</Badge></td>
              </tr>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default QuestionReviewQueuePage;