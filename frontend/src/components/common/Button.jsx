function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={['btn', 'btn-' + variant, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </button>
  );
}

export default Button;
