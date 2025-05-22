import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from '../ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: 1,
    name: 'Test Product',
    price: 99.99,
    image: '/images/test.jpg',
    description: 'Test Description',
    category: 'Test Category',
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.description)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.category)).toBeInTheDocument();
    expect(screen.getByText(`$${mockProduct.price.toFixed(2)}`)).toBeInTheDocument();
  });

  it('handles edit button click', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockProduct.id);
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('handles delete button click', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockProduct.id);
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('handles missing price gracefully', () => {
    const productWithoutPrice = {
      ...mockProduct,
      price: undefined as any,
    };

    render(
      <ProductCard
        product={productWithoutPrice}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('handles image loading', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const image = screen.getByAltText(mockProduct.name);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining(mockProduct.image));
  });
}); 