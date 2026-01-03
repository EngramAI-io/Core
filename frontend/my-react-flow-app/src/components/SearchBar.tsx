import React, { useState } from 'react';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search events...',
}) => {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16l4 4" />
          </svg>
        </span>
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
        />
        {query && (
          <button
            className="search-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
