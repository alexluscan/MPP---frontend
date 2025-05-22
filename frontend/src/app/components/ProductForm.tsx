"use client";

import { useState, useEffect } from 'react';
import { Product, CreateProductRequest } from '@/types/product';
import { productApi } from '@/services/api';
import { useNetworkStatus } from '@/services/networkStatus';

interface Category {
  id: number;
  name: string;
}

interface ProductFormProps {
  product?: Product;
  onSubmit: (product: Product) => void;
  onCancel: () => void;
  userId: number;
}

export default function ProductForm({ product, onSubmit, onCancel, userId }: ProductFormProps) {
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: product?.name || '',
    price: product?.price || 0,
    image: product?.image || '',
    description: product?.description || '',
    category_id: (product as any)?.category_id ?? 0,
    video: null,
    user_id: userId,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>(product?.video?.split('/').pop() || '');
  const networkStatus = useNetworkStatus();

  console.log('ProductForm rendered');

  useEffect(() => {
    fetch('https://mpp-backend-1-f82n.onrender.com/api/get/categories')
      .then(res => {
        if (!res.ok) {
          console.error('Failed to fetch categories:', res.status, res.statusText);
          return [];
        }
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) {
          console.error('Categories response is not an array:', data);
          setCategories([]);
          return;
        }
        const mapped = data.map((cat: any) => ({
          id: cat.id,
          name: cat.name || cat.category_name
        }));
        setCategories(mapped);
        console.log('Fetched categories:', mapped);
      })
      .catch((err) => {
        console.error('Error fetching categories:', err);
        setCategories([]);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('ProductForm handleSubmit called');
    setError(null);

    try {
      console.log('Submitting formData:', formData);
      const name = typeof formData.name === 'string' ? formData.name : '';
      const image = typeof formData.image === 'string' ? formData.image : '';
      const description = typeof formData.description === 'string' ? formData.description : '';
      if (!name.trim() || !formData.price || !image.trim() || !description.trim() || !formData.category_id) {
        setError('Please fill in all required fields');
        return;
      }

      const price = Number(formData.price);
      if (isNaN(price) || price <= 0) {
        setError('Please enter a valid price greater than 0');
        return;
      }

      let videoUrl = formData.video;
      if (formData.video && formData.video instanceof File && !networkStatus.isNetworkDown && !networkStatus.isServerDown) {
        try {
          videoUrl = await productApi.uploadVideo(formData.video);
        } catch (error) {
          setError('Failed to upload video. Please try again.');
          return;
        }
      }

      const productData: CreateProductRequest = {
        name: name.trim(),
        price: price,
        image: image.trim(),
        description: description.trim(),
        category_id: Number(formData.category_id),
        video: videoUrl,
        user_id: userId
      };

      if (product) {
        if (networkStatus.isNetworkDown || networkStatus.isServerDown) {
          const safeVideo = typeof productData.video === 'string' ? productData.video : undefined;
          networkStatus.addPendingOperation({ type: 'UPDATE', data: { ...product, ...productData, video: safeVideo } });
          onSubmit({ ...product, ...productData, video: safeVideo });
        } else {
          const updatedProduct = await productApi.update(product.id, productData);
          onSubmit(updatedProduct);
        }
      } else {
        if (networkStatus.isNetworkDown || networkStatus.isServerDown) {
          const tempId = Date.now();
          const safeVideo = typeof productData.video === 'string' ? productData.video : undefined;
          networkStatus.addPendingOperation({ type: 'CREATE', data: { ...productData, id: tempId, video: safeVideo } });
          onSubmit({ ...productData, id: tempId, video: safeVideo, category: '', category_name: '' } as Product);
        } else {
          const newProduct = await productApi.create(productData);
          onSubmit(newProduct);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save product';
      setError(errorMessage);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | number | null = value;
    if (name === 'price') {
      newValue = type === 'number' ? Number(value) : parseFloat(value);
      if (isNaN(newValue as number)) newValue = 0;
    }
    if (name === 'category_id') {
      newValue = Number(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError('Video file size must be less than 100MB');
        return;
      }
      if (!file.type.startsWith('video/')) {
        setError('Please upload a valid video file');
        return;
      }
      setFormData(prev => ({
        ...prev,
        video: file as File
      }));
      setVideoName(file.name);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-bold">{product ? 'Update Product' : 'Add New Product'}</h2>
      {error && <div className="text-red-500">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter product name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Price</label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          step="0.01"
          min="0"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          name="category_id"
          value={formData.category_id}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value={0}>Select a category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Image URL</label>
        <input
          type="text"
          name="image"
          value={formData.image}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Video (optional, max 100MB)</label>
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {videoName && (
          <p className="mt-1 text-sm text-gray-500">
            Selected video: {videoName}
          </p>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {product ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}
