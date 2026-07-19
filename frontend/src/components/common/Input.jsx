function Input({ label, className = '', type = 'text', as = 'input', ...props }) {
  const field = as === 'textarea' ? (
    <textarea className={['textarea', className].filter(Boolean).join(' ')} {...props} />
  ) : (
    <input type={type} className={['input', className].filter(Boolean).join(' ')} {...props} />
  );

  return label ? (
    <label className="input-group">
      <span className="input-label">{label}</span>
      {field}
    </label>
  ) : (
    field
  );
}

export default Input;
