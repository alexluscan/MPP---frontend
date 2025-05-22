export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  category_name: string;
  video?: string; // Optional video URL/path
}

export interface CreateProductRequest {
  name: string;
  price: number;
  image: string;
  description: string;
  category_id: number;
  user_id: number;
  video?: string | File | null;
}

export interface ProductQuery {
  category_id?: number;
  min_price?: number;
  max_price?: number;
  search_term?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface BackendCategory {
  id: number;
  name?: string;
  category_name?: string;
} 