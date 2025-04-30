import { useDebounceCallback } from 'usehooks-ts';
import { Input } from '~/components/ui/input';

type SearchBarProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  debounceTime?: number;
};

export function SearchBar({
  onSearch,
  placeholder = 'Search...',
  isLoading = false,
  debounceTime = 0,
}: SearchBarProps) {
  const debouncedSearch = useDebounceCallback(onSearch, debounceTime);

  return (
    <div className="relative">
      <Input
        onChange={(e) => debouncedSearch(e.target.value)}
        placeholder={placeholder}
        type="text"
      />
      {isLoading && (
        <div className="-translate-y-1/2 absolute top-1/2 right-3 transform">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
