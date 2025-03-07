import { type ChangeEvent, useState } from 'react';
import { Input } from '~/components/ui/input';
import type { Contact } from './contact';

type SearchBarProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
};

export function SearchBar({
  onSearch,
  placeholder = 'Search...',
  isLoading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="relative">
      <Input
        onChange={handleInputChange}
        placeholder={placeholder}
        type="text"
        value={query}
      />
      {isLoading && (
        <div className="-translate-y-1/2 absolute top-1/2 right-3 transform">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}

// Hook for local contact filtering
export function useContactFilter(contacts: Contact[], searchQuery: string) {
  if (!searchQuery.trim()) return contacts;

  const lowercaseQuery = searchQuery.toLowerCase();
  return contacts.filter((contact) =>
    contact.username.toLowerCase().includes(lowercaseQuery),
  );
}
