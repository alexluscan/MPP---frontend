import axios from 'axios';
import { Product, CreateProductRequest, ProductQuery } from '../types/product';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const getProducts = async (query?: ProductQuery): Promise<Product[]> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/products`, {
        params: query,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

export const createProduct = async (product: CreateProductRequest): Promise<Product> => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/products`, product, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

export const updateProduct = async (id: number, product: CreateProductRequest): Promise<Product> => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/products/${id}`, product, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_URL}/products/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
};

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  category_id: number;
  category_name: string;
  video?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ProductService {
  private products: Product[] = [];

  // Validation function
  private validateProduct(product: Omit<Product, "id">): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!product.name || product.name.trim().length < 3) {
      errors.push({
        field: "name",
        message: "Name must be at least 3 characters long",
      });
    }

    if (!product.price || product.price <= 0) {
      errors.push({
        field: "price",
        message: "Price must be greater than 0",
      });
    }

    if (!product.description || product.description.trim().length < 10) {
      errors.push({
        field: "description",
        message: "Description must be at least 10 characters long",
      });
    }

    if (!product.category_id) {
      errors.push({
        field: "category_id",
        message: "Category is required",
      });
    }

    return errors;
  }

  // Get paginated products with optional filtering and sorting
  getProducts(
    page: number = 1,
    pageSize: number = 10,
    filters?: ProductFilters,
    sortBy?: keyof Product,
    sortOrder: "asc" | "desc" = "asc"
  ): PaginatedProducts {
    let filteredProducts = [...this.products];

    // Apply filters
    if (filters) {
      if (filters.category) {
        filteredProducts = filteredProducts.filter(
          (p) => p.category_name === filters.category
        );
      }

      if (filters.minPrice !== undefined) {
        filteredProducts = filteredProducts.filter(
          (p) => p.price >= filters.minPrice!
        );
      }

      if (filters.maxPrice !== undefined) {
        filteredProducts = filteredProducts.filter(
          (p) => p.price <= filters.maxPrice!
        );
      }

      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );
      }
    }

    // Apply sorting
    if (sortBy) {
      filteredProducts.sort((a, b) => {
        const aValue = a[sortBy] ?? 0;
        const bValue = b[sortBy] ?? 0;
        if (sortOrder === "asc") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    // Calculate pagination
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    return {
      products: paginatedProducts,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  // Get all products without pagination (for charts)
  getAllProducts(): Product[] {
    return [...this.products];
  }

  // Get statistics
  getStatistics() {
    const products = this.getAllProducts();
    const prices = products.map(p => p.price);
    
    return {
      totalProducts: products.length,
      averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      categories: this.getCategories(),
      categoryCounts: products.reduce((acc, product) => {
        acc[product.category_name] = (acc[product.category_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  getCategories(): string[] {
    return Array.from(new Set(this.products.map((p) => p.category_name)));
  }

  addProduct(product: Omit<Product, "id">): {
    product?: Product;
    errors?: ValidationError[];
  } {
    const errors = this.validateProduct(product);
    if (errors.length > 0) {
      return { errors };
    }

    const newProduct: Product = {
      ...product,
      id: Math.max(...this.products.map((p) => p.id), 0) + 1,
    };

    this.products.push(newProduct);
    return { product: newProduct };
  }

  updateProduct(
    id: number,
    product: Omit<Product, "id">
  ): { product?: Product; errors?: ValidationError[] } {
    const errors = this.validateProduct(product);
    if (errors.length > 0) {
      return { errors };
    }

    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return {
        errors: [{ field: "id", message: "Product not found" }],
      };
    }

    const updatedProduct: Product = {
      ...product,
      id,
    };

    this.products[index] = updatedProduct;
    return { product: updatedProduct };
  }

  deleteProduct(id: number): boolean {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return false;
    }

    this.products.splice(index, 1);
    return true;
  }
}

export const productService = new ProductService();
