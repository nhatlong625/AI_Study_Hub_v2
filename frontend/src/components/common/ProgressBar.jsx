function ProgressBar({ value }) {
  return (
    <div className="progress-bar" aria-label={'Progress ' + value + '%'}>
      <span style={{ width: value + '%' }} />
    </div>
  );
}

export default ProgressBar;
