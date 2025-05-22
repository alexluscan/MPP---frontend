import { Product, CreateProductRequest, ProductQuery } from '../types/product';

const API_BASE_URL = 'http://localhost:3001/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const error = await response.json();
      errorMessage = error.message || JSON.stringify(error) || errorMessage;
    } catch (e) {
      // Try to get text if not JSON
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {}
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

// Helper function to format price to 2 decimal places
function formatPrice(price: number): number {
  return parseFloat(price.toFixed(2));
}

// Helper function to make API requests with retry logic
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    const response = await fetch(url, options);
    return await handleResponse<T>(response);
  } catch (error) {
    if (retries > 0) {
      console.log(`Request failed, retrying... (${retries} attempts left)`);
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Product API functions
export const productApi = {
  // Get all products with optional filtering and sorting
  getAll: async (query?: ProductQuery): Promise<Product[]> => {
    const queryParams = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/get/products?${queryParams}`);
    return handleResponse<Product[]>(response);
  },

  // Get a single product by ID
  getById: async (id: number): Promise<Product> => {
    const product = await fetchWithRetry<Product>(
      `${API_BASE_URL}/get/products/${id}`,
      { method: 'GET' }
    );
    
    return {
      ...product,
      price: formatPrice(product.price)
    };
  },

  // Create a new product
  create: async (productData: CreateProductRequest): Promise<Product> => {
    console.log('productApi.create called with:', productData);
    let videoUrl = productData.video;
    // If video is a File object, upload it first
    if (productData.video instanceof File) {
      videoUrl = await productApi.uploadVideo(productData.video);
    }
    // Prepare the payload
    const payload = {
      ...productData,
      video: typeof videoUrl === 'string' ? videoUrl : undefined
    };
    const response = await fetch(`${API_BASE_URL}/post/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse<Product>(response);
    return {
      ...data,
      price: formatPrice(data.price)
    };
  },

  // Update a product
  update: async (id: number, productData: Partial<CreateProductRequest>): Promise<Product> => {
    const response = await fetch(`${API_BASE_URL}/patch/products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...productData,
        price: productData.price ? formatPrice(productData.price) : undefined
      }),
    });
    const data = await handleResponse<Product>(response);
    return {
      ...data,
      price: formatPrice(data.price)
    };
  },

  // Partially update a product
  patch: async (id: number, productData: any): Promise<Product> => {
    const patchedProduct = await fetchWithRetry<Product>(
      `${API_BASE_URL}/patch/products/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      }
    );
    
    return {
      ...patchedProduct,
      price: formatPrice(patchedProduct.price)
    };
  },

  // Delete a product
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/delete/products/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      if (response.status === 204) return; // No Content, success
      let errorMessage = 'An error occurred';
      try {
        const error = await response.json();
        errorMessage = error.message || JSON.stringify(error) || errorMessage;
      } catch (e) {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch {}
      }
      throw new Error(errorMessage || 'Failed to delete product');
    }
  },

  // Upload a video file
  uploadVideo: async (videoFile: File): Promise<string> => {
    if (!videoFile) {
      throw new Error('No video file provided');
    }

    const formData = new FormData();
    formData.append('video', videoFile);

    const response = await fetch(`${API_BASE_URL}/upload/video`, {
      method: 'POST',
      body: formData,
    });

    const data = await handleResponse<{filepath: string}>(response);
    if (!data.filepath) {
      throw new Error('Video upload failed: No filepath returned');
    }

    return data.filepath;
  },

  toggleGeneration: async (): Promise<{ generating: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/toggle-generation`, {
      method: 'POST',
    });
    return handleResponse<{ generating: boolean }>(response);
  },

  // Get products for a specific user by user_id
  getByUserId: async (userId: number, query?: ProductQuery): Promise<Product[]> => {
    const queryParams = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/get/products/user/${userId}?${queryParams}`);
    return handleResponse<Product[]>(response);
  },

  // Fetch monitored users (admin only)
  getMonitoredUsers: async (userId: number): Promise<{user_id: number, username: string}[]> => {
    const response = await fetch(`${API_BASE_URL}/monitored-users?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch monitored users');
    return response.json();
  }
};

export const api = {
  getAll: productApi.getAll,
  getById: productApi.getById,
  create: productApi.create,
  update: productApi.update,
  patch: productApi.patch,
  delete: productApi.delete,
  uploadVideo: productApi.uploadVideo,
  toggleGeneration: productApi.toggleGeneration,
  getByUserId: productApi.getByUserId,
  getMonitoredUsers: productApi.getMonitoredUsers
};