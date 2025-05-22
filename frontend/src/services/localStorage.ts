"use client";

import { useNetworkStatus } from './networkStatus';

const STORAGE_KEY = 'offline_operations';
const API_BASE_URL = 'http://localhost:3001/api';

interface ProductData {
  id?: number;
  name: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  image?: string;
}

interface Operation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  data: ProductData;
}

// Validate and process product data
const processProductData = (data: ProductData): ProductData => {
  return {
    ...(data.id ? { id: Number(data.id) } : {}),
    name: data.name?.trim() || '',
    ...(data.description ? { description: data.description } : {}),
    ...(data.price ? { price: Number(data.price) } : {}),
    ...(data.stock ? { stock: Number(data.stock) } : {}),
    ...(data.category ? { category: data.category } : {}),
    ...(data.image ? { image: data.image } : {})
  };
};

export const saveToLocalStorage = (operations: Operation[]) => {
  if (typeof window !== 'undefined') {
    try {
      // Process each operation's data before saving
      const processedOperations = operations.map(op => ({
        type: op.type,
        data: processProductData(op.data)
      }));
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processedOperations));
      console.log('Saved to localStorage:', processedOperations);
      // Also write to localStorage.json if running in Node.js (local dev)
      if (typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          fs.writeFileSync(__dirname + '/localStorage.json', JSON.stringify(processedOperations, null, 2));
          console.log('Saved to localStorage.json for backend sync');
        } catch (err) {
          // Ignore if not running in Node.js
        }
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
};

export const loadFromLocalStorage = (): Operation[] => {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const operations = JSON.parse(data);
      
      // Validate and process each operation's data when loading
      const processedOperations = operations.map((op: Operation) => ({
        type: op.type,
        data: processProductData(op.data)
      }));

      console.log('Loaded from localStorage:', processedOperations);
      return processedOperations;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return [];
    }
  }
  return [];
};

export const clearLocalStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Cleared localStorage');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

export const syncWithServer = async (apiEndpoint: string) => {
  const operations = loadFromLocalStorage();
  const networkStatus = useNetworkStatus.getState();
  
  console.log('Starting sync process:', { 
    operationsCount: operations.length,
    networkStatus 
  });

  if (operations.length === 0) {
    console.log('No operations to sync');
    return;
  }

  if (networkStatus.isNetworkDown || networkStatus.isServerDown) {
    console.log('Network or server is down, skipping sync');
    return;
  }

  try {
    for (const operation of operations) {
      let endpoint = '';
      switch (operation.type) {
        case 'CREATE':
          endpoint = `${API_BASE_URL}/post/products`;
          break;
        case 'UPDATE':
          endpoint = `${API_BASE_URL}/patch/products/${operation.data.id}`;
          break;
        case 'DELETE':
          endpoint = `${API_BASE_URL}/delete/products/${operation.data.id}`;
          break;
        default:
          console.error('Unknown operation type:', operation.type);
          continue;
      }

      // Convert string numbers to actual numbers and ensure proper data structure
      const processedData = operation.data ? {
        name: operation.data.name?.trim() || operation.data.name, // Preserve original name if it exists, just trim whitespace
        description: operation.data.description,
        price: operation.data.price ? Number(operation.data.price) : undefined,
        stock: operation.data.stock ? Number(operation.data.stock) : undefined,
        // Only include other fields from original data that we want to keep
        ...(operation.data.category ? { category: operation.data.category } : {}),
        ...(operation.data.image ? { image: operation.data.image } : {}),
        // Include ID only for non-CREATE operations
        ...(operation.type !== 'CREATE' && operation.data.id ? { id: operation.data.id } : {})
      } : undefined;

      // Validate required fields before sending
      if (operation.type === 'CREATE' && (!processedData?.name || processedData.name.trim() === '')) {
        throw new Error('Product name is required for creation');
      }

      // Log the exact data being sent
      console.log(`${operation.type} request details:`, {
        endpoint,
        method: operation.type === 'DELETE' ? 'DELETE' : 
               operation.type === 'UPDATE' ? 'PATCH' : 'POST',
        data: processedData,
        dataTypes: processedData ? Object.entries(processedData).map(([key, value]) => ({
          field: key,
          type: typeof value,
          value: value
        })) : null
      });

      try {
        const response = await fetch(endpoint, {
          method: operation.type === 'DELETE' ? 'DELETE' : 
                 operation.type === 'UPDATE' ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: operation.type !== 'DELETE' ? JSON.stringify(processedData) : undefined,
        });

        // Log raw response for debugging
        const responseText = await response.text();
        console.log(`Raw ${operation.type} response:`, {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });

        if (!response.ok) {
          throw new Error(`${operation.type} failed: ${response.status} - ${responseText}`);
        }

        // Parse the response only if it's not empty
        const responseData = responseText ? JSON.parse(responseText) : null;
        console.log(`${operation.type} successful:`, {
          endpoint,
          status: response.status,
          data: responseData
        });
      } catch (error: any) {
        const errorMessage = `Failed to ${operation.type.toLowerCase()}: ${error.message}`;
        console.error(errorMessage, {
          endpoint,
          data: processedData
        });
        throw new Error(errorMessage);
      }
    }

    console.log('All operations completed successfully, clearing local storage');
    clearLocalStorage();
    networkStatus.clearPendingOperations();
  } catch (error: any) {
    console.error('Sync process failed:', error.message);
    networkStatus.setServerStatus(true);
    throw error;
  }
};

export const clearFailedOperations = () => {
  if (typeof window !== 'undefined') {
    try {
      const operations = loadFromLocalStorage();
      console.log('Current operations:', operations);
      
      // Remove any operations that might be causing issues
      const validOperations = operations.filter(op => 
        op.type && 
        op.data && 
        (op.type !== 'CREATE' || (op.data.name && op.data.name.trim() !== ''))
      );

      if (validOperations.length < operations.length) {
        console.log('Removed invalid operations:', {
          before: operations.length,
          after: validOperations.length
        });
        saveToLocalStorage(validOperations);
      }
    } catch (error) {
      console.error('Error clearing failed operations:', error);
      // If something goes wrong, clear everything to be safe
      clearLocalStorage();
    }
  }
};

// Force clear everything from localStorage
const forceCleanLocalStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Forcefully cleared all operations from localStorage');
    } catch (error) {
      console.error('Error while force clearing localStorage:', error);
    }
  }
};

// Immediately clear localStorage
forceCleanLocalStorage();

// Clear the problematic operations right now
clearFailedOperations();

// Export localStorage products to a JSON file for backend sync (browser-friendly)
export const exportLocalStorageToFile = () => {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        alert('No localStorage data to export.');
        return;
      }
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'localStorage.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('localStorage.json exported. Place this file in frontend/src/services/ for backend sync.');
    } catch (error) {
      alert('Failed to export localStorage: ' + error);
    }
  }
};