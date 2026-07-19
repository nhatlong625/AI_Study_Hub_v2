import Card from '../common/Card';
import Badge from '../common/Badge';
import ProgressBar from '../common/ProgressBar';

function DocumentCard({ document }) {
  return (
    <Card title={document.title} description={document.description} action={<Badge>{document.type}</Badge>}>
      <div className="section-stack">
        <div className="inline-filters">
          <Badge tone="success">{document.category}</Badge>
          <Badge>{document.course}</Badge>
        </div>
        <div className="muted">{document.pages} pages - {document.size} - Updated {document.updatedAt}</div>
        <ProgressBar value={document.progress} />
      </div>
    </Card>
  );
}

export default DocumentCard;
