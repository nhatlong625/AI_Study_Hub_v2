function Badge({ tone = 'primary', children }) {
  return <span className={'badge badge-' + tone}>{children}</span>;
}

export default Badge;
