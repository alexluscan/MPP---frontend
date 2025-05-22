import { render } from '@testing-library/react';
import Statistics from '../Statistics';
import { Product } from '../../../services/productService';

// Mock Chart.js
jest.mock('chart.js/auto', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation((ctx, config) => {
      const instance = {
        destroy: jest.fn(),
        update: jest.fn(),
        config
      };
      if (!global.__chartjs_instances__) {
        global.__chartjs_instances__ = [];
      }
      // Remove any existing instances with the same title
      const titleText = config.options?.plugins?.title?.text;
      if (titleText) {
        global.__chartjs_instances__ = global.__chartjs_instances__.filter(
          (c: any) => c.config.options?.plugins?.title?.text !== titleText
        );
      }
      global.__chartjs_instances__.push(instance);
      return instance;
    })
  };
});

describe('Statistics Chart Categories', () => {
  beforeEach(() => {
    global.__chartjs_instances__ = [];
  });

  it('adds new category when new product type is added', () => {
    const product = {
      id: 1,
      name: "Running Shoes",
      price: 99.99,
      image: "/test.jpg",
      description: "Test",
      category: "Shoes"
    };

    const { rerender } = render(<Statistics products={[product]} />);

    let chart = (global as any).__chartjs_instances__?.find(
      (c: any) => c.config.options?.plugins?.title?.text === 'Category Distribution'
    );
    expect(chart.config.data.labels).toEqual(['Shoes']);

    const newProduct = { ...product, id: 2, category: 'Clothes' };
    rerender(<Statistics products={[product, newProduct]} />);

    chart = (global as any).__chartjs_instances__?.find(
      (c: any) => c.config.options?.plugins?.title?.text === 'Category Distribution'
    );
    expect(chart.config.data.labels).toEqual(['Shoes', 'Clothes']);
  });
});
