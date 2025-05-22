'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';
import { getProducts, createProduct, deleteProduct } from '@/services/productService';
import { useAuth } from '@/hooks/useAuth';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        setError('Failed to fetch products');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isAuthenticated, router]);

  const handleCreateProduct = () => {
    router.push('/products/create');
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      setError('Failed to delete product');
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Products</h1>
      
      <button
        onClick={handleCreateProduct}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Add New Product
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product.id} className="border p-4 rounded shadow">
            <img src={product.image} alt={product.name} className="w-full h-48 object-cover mb-2" />
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-gray-600">${product.price}</p>
            <p className="text-sm text-gray-500">{product.category_name}</p>
            <p className="mt-2">{product.description}</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => router.push(`/products/${product.id}/edit`)}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteProduct(product.id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 