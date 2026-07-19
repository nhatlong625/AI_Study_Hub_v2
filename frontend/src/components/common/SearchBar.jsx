function SearchBar({ placeholder = 'Search', className = '' }) {
  return (
    <label className={['searchbar', className].filter(Boolean).join(' ')}>
      <span className="searchbar-icon">S</span>
      <input className="input" placeholder={placeholder} />
    </label>
  );
}

export default SearchBar;
