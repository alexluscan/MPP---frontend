"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Product, ProductQuery } from '@/types/product';
import { productApi } from '@/services/api';
import ProductForm from './components/ProductForm';
import FilterBar from './components/FilterBar';
import { useOfflineOperations } from '@/hooks/useOfflineOperations';
import { useNetworkStatus } from '@/services/networkStatus';
import ProductCard from './components/ProductCard';
import StatusIndicator from './components/StatusIndicator';
import Statistics from './components/Statistics';
import { api } from '@/services/api';
import mockProducts from './mockProducts';
import { syncWithServer } from '@/services/localStorage';
import LoginPage from './components/LoginPage';

export default function Home() {
  console.log('Home component rendered');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPaginationEnabled, setIsPaginationEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isWsOpen, setIsWsOpen] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const productsPerPage = 12;
  
  const { isOffline, isServerDown, pendingOperations } = useOfflineOperations('/api/products');
  const { addPendingOperation } = useNetworkStatus();

  const [user, setUser] = useState<any>(null);
  const [userLoaded, setUserLoaded] = useState(false);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  const [monitoredUsers, setMonitoredUsers] = useState<{user_id: number, username: string}[]>([]);

  const connectWebSocket = useCallback(() => {
    const websocket = new WebSocket('ws://localhost:3001/ws');
    wsRef.current = websocket;
    websocket.onopen = () => {
      console.log('WebSocket Connected');
      setWs(websocket);
      setIsWsOpen(true);
    };
    websocket.onmessage = (event) => {
      const newProduct = JSON.parse(event.data);
      setProducts(prevProducts => [...prevProducts, newProduct]);
    };
    websocket.onclose = () => {
      console.log('WebSocket Disconnected');
      setWs(null);
      setIsWsOpen(false);
    };
    websocket.onerror = (error) => {
      console.warn('WebSocket error:', error);
    };
  }, []);

  const disconnectWebSocketAndShutdown = useCallback(async () => {
    try {
      await fetch('http://localhost:3001/api/shutdown');
    } catch (e) {
      // Ignore errors, server will shut down anyway
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsWsOpen(false);
    }
  }, []);

  // Helper to load products from local storage
  const loadProductsFromLocalStorage = () => {
    const data = localStorage.getItem('products');
    if (data) {
      return JSON.parse(data) as Product[];
    }
    return null;
  };

  // Helper to save products to local storage
  const saveProductsToLocalStorage = (products: Product[]) => {
    localStorage.setItem('products', JSON.stringify(products));
  };

  // On mount, always reset local storage to the static mockProducts if empty or on restart
  useEffect(() => {
    let localProducts = loadProductsFromLocalStorage();
    if (!localProducts || !Array.isArray(localProducts) || localProducts.length !== mockProducts.length) {
      // Add category_name to mockProducts for type compatibility
      const fixedMockProducts = mockProducts.map(p => ({ ...p, category_name: p.category || '' }));
      saveProductsToLocalStorage(fixedMockProducts);
      localProducts = fixedMockProducts;
    }
    setProducts(localProducts || []);
  }, []);

  // When online, fetch from backend and update local storage
  useEffect(() => {
    console.log('useEffect: isOffline:', isOffline, 'user:', user);
    if (!isOffline && user && user.id) {
      fetchProducts();
    }
  }, [isOffline, user?.id]);

  // When products change and online, update local storage
  useEffect(() => {
    if (!isOffline && products.length > 0) {
      saveProductsToLocalStorage(products);
    }
  }, [products, isOffline]);

  useEffect(() => {
    if (isWsOpen) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isWsOpen, connectWebSocket]);

  const fetchProducts = async (filters?: ProductQuery) => {
    try {
      console.log('fetchProducts called, user:', user);
      if (user && user.id) {
        const url = `http://localhost:3001/api/get/products/user/${user.id}`;
        console.log('Fetching from:', url);
        const data = await productApi.getByUserId(user.id, filters);
        console.log('Fetched products:', data);
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGeneration = async () => {
    try {
      const response = await api.toggleGeneration();
      setIsGenerating(response.generating);
      console.log('Product generation toggled:', response.generating);
    } catch (error) {
      console.error('Error toggling generation:', error);
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/get/categories')
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((cat: any) => ({
          id: cat.id,
          name: cat.name || cat.category_name
        }));
        setCategories(mapped);
      })
      .catch(() => setCategories([]));
  }, []);

  const handleAddProduct = async (product: Product) => {
    console.log('handleAddProduct called with:', product);
    if (isOffline) {
      addPendingOperation({ type: 'CREATE', data: product });
      // Do not add to state
    } else {
      try {
        // Map category name to category_id
        const categoryObj = categories.find(cat => cat.name === product.category);
        const productData = {
          name: product.name,
          price: product.price,
          image: product.image,
          description: product.description,
          category_id: categoryObj ? categoryObj.id : 1, // fallback if not found
          video: product.video,
          user_id: user.id
        };
        const newProduct = await productApi.create(productData);
        // Immediately delete the product
        await productApi.delete(newProduct.id);
        // Do not add to state
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add product');
      }
    }
    setShowAddForm(false);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (isOffline) {
      addPendingOperation({ type: 'UPDATE', data: updatedProduct });
      setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } else {
      try {
        const categoryObj = categories.find(cat => cat.name === updatedProduct.category);
        const productData = {
          name: updatedProduct.name,
          price: updatedProduct.price,
          image: updatedProduct.image,
          description: updatedProduct.description,
          category_id: categoryObj ? categoryObj.id : 1,
          video: updatedProduct.video,
          user_id: user.id
        };
        const result = await productApi.update(updatedProduct.id, productData);
        setProducts(products.map(p => p.id === result.id ? result : p));
      } catch (err) {
        addPendingOperation({ type: 'UPDATE', data: updatedProduct });
        setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      }
    }
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: number) => {
    if (isOffline) {
      // Store operation locally
      addPendingOperation({ type: 'DELETE', data: { id, user_id: user.id } });
      // Update local state optimistically
      setProducts(products.filter(p => p.id !== id));
    } else {
      try {
        await productApi.delete(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (err) {
        console.error('Delete error:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete product');
        // If server is down, store locally
        addPendingOperation({ type: 'DELETE', data: { id, user_id: user.id } });
        setProducts(products.filter(p => p.id !== id));
      }
    }
  };

  const handleFilter = (filters: ProductQuery) => {
    fetchProducts(filters);
  };

  // Get current products for pagination
  const getCurrentProducts = () => {
    if (!isPaginationEnabled) return products;
    
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    return products.slice(indexOfFirstProduct, indexOfLastProduct);
  };

  const totalPages = Math.ceil(products.length / productsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add a useEffect to sync when coming back online
  useEffect(() => {
    if (!isOffline && !isServerDown) {
      syncWithServer('/api/get/products');
    }
  }, [isOffline, isServerDown]);

  console.log('Products passed to Statistics:', products);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      setUser(stored ? JSON.parse(stored) : null);
      setUserLoaded(true);
    }
  }, []);

  // Save user to localStorage on login
  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Log out user on frontend unmount/reload
  useEffect(() => {
    return () => {
      localStorage.removeItem('user');
    };
  }, []);

  // Add logout handler
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  useEffect(() => {
    if (user && user.role === 'Admin') {
      api.getMonitoredUsers(user.id)
        .then(setMonitoredUsers)
        .catch(() => setMonitoredUsers([]));
    } else {
      setMonitoredUsers([]);
    }
  }, [user]);

  if (!userLoaded) {
    return null;
  }

  // If not logged in, show login page
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (showAddForm) {
    console.log('Rendering ProductForm for add');
  }
  if (editingProduct) {
    console.log('Rendering ProductForm for edit');
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <StatusIndicator />
      {user && user.role === 'Admin' && (
        <div className="mb-6 p-4 border rounded bg-yellow-50">
          <h2 className="text-lg font-bold mb-2 text-yellow-800">Monitored Users (Suspicious Activity)</h2>
          {monitoredUsers.length === 0 ? (
            <div className="text-gray-500">No monitored users.</div>
          ) : (
            <ul>
              {monitoredUsers.map(u => (
                <li key={u.user_id} className="text-yellow-900">{u.username} (ID: {u.user_id})</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {loading && (
        <div className="mb-4 text-center text-gray-500">Loading...</div>
      )}
      {error && (
        <div className="mb-4 text-center text-red-500">Error: {error}</div>
      )}
      {/* Statistics with real-time updates */}
      <div className="mt-20 mb-8">
        <div className="flex items-center gap-4 mb-4 justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleGeneration}
              className={`px-6 py-2 rounded-md transition-colors ${
                isGenerating 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isGenerating ? 'Stop Generating' : 'Start Generating'}
            </button>
            <h2 className="text-2xl font-bold">Real-time Analytics</h2>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Log out
          </button>
        </div>
        {products && products.length > 0 ? (
          <Statistics products={products} />
        ) : (
          <div className="text-center text-gray-400">No product data available for charts.</div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setIsPaginationEnabled(!isPaginationEnabled)}
            className={`px-6 py-2 rounded-md transition-colors ${
              isPaginationEnabled 
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {isPaginationEnabled ? 'Pagination On' : 'Pagination Off'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingProduct(null);
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Product
          </button>
        </div>
      </div>

      <FilterBar onFilter={handleFilter} />

      {showAddForm && (
        <div className="mb-6">
          <ProductForm
            onSubmit={handleAddProduct}
            onCancel={() => setShowAddForm(false)}
            userId={user.id}
          />
        </div>
      )}

      {editingProduct && (
        <div className="mb-6">
          <ProductForm
            product={editingProduct}
            onSubmit={handleUpdateProduct}
            onCancel={() => setEditingProduct(null)}
            userId={user.id}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getCurrentProducts().length === 0 ? (
          <div className="col-span-full text-center text-gray-500">No products available.</div>
        ) : (
          getCurrentProducts().map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => {
                setEditingProduct(product);
                setShowAddForm(false);
              }}
              onDelete={() => handleDeleteProduct(product.id)}
            />
          ))
        )}
      </div>

      {isPaginationEnabled && totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>

          <span className="text-gray-600">
            Page {currentPage} of {totalPages} ({products.length} total products)
          </span>
        </div>
      )}

      {pendingOperations && pendingOperations.length > 0 && (
        <div className="mb-4 text-center text-yellow-600 font-semibold">
          {pendingOperations.length} change(s) will sync when back online.
        </div>
      )}
    </main>
  );
}
