import { useState, useEffect } from 'react';
import { ProductQuery, BackendCategory } from '@/types/product';

interface Category {
  id: number;
  name: string | undefined;
}

interface FilterBarProps {
  onFilter: (filters: ProductQuery) => void;
}

export default function FilterBar({ onFilter }: FilterBarProps) {
  const [filters, setFilters] = useState<ProductQuery>({
    category_id: undefined,
    min_price: undefined,
    max_price: undefined,
    search_term: '',
    sort_by: 'name',
    sort_order: 'asc'
  });
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/get/categories')
      .then(res => res.json())
      .then((data: BackendCategory[]) => {
        const mapped = data.map(cat => ({
          id: cat.id,
          name: cat.name || cat.category_name
        }));
        setCategories(mapped);
      })
      .catch(() => setCategories([]));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name === 'category_id' ? (value === '' ? undefined : Number(value)) : (value === '' ? undefined : value)
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value === '' ? undefined : parseFloat(value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter(filters);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            name="category_id"
            value={filters.category_id || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Price</label>
          <input
            type="number"
            name="min_price"
            value={filters.min_price || ''}
            onChange={handlePriceChange}
            step="0.01"
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Price</label>
          <input
            type="number"
            name="max_price"
            value={filters.max_price || ''}
            onChange={handlePriceChange}
            step="0.01"
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Search</label>
          <input
            type="text"
            name="search_term"
            value={filters.search_term || ''}
            onChange={handleChange}
            placeholder="Search products..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Sort By</label>
          <select
            name="sort_by"
            value={filters.sort_by}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="category">Category</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sort Order</label>
          <select
            name="sort_order"
            value={filters.sort_order}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Apply Filters
        </button>
      </div>
    </form>
  );
} 