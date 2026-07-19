import Card from '../common/Card';

function FeatureHighlight({ title, description, badge }) {
  return <Card title={title} description={description} action={badge} />;
}

export default FeatureHighlight;
