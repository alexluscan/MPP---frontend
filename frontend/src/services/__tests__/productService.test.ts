import { productService } from "../productService";

describe("ProductService", () => {
  const testProduct = {
    name: "Test Product",
    price: 99.99,
    image: "/images/test.jpg",
    description: "Test product description that is long enough",
    category: "Test Category",
  };

  beforeEach(() => {
    // Reset the product service state before each test
    const products = productService.getAllProducts();
    products.forEach(product => {
      productService.deleteProduct(product.id);
    });
  });

  describe("addProduct", () => {
    it("should add a valid product", () => {
      const result = productService.addProduct(testProduct);
      expect(result.product).toBeDefined();
      expect(result.product?.name).toBe(testProduct.name);
      expect(result.errors).toBeUndefined();
    });

    it("should validate product name length", () => {
      const result = productService.addProduct({
        ...testProduct,
        name: "ab",
      });
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe("name");
    });

    it("should validate product price", () => {
      const result = productService.addProduct({
        ...testProduct,
        price: -1,
      });
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe("price");
    });

    it("should validate product description length", () => {
      const result = productService.addProduct({
        ...testProduct,
        description: "short",
      });
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe("description");
    });

    it("should validate product category", () => {
      const result = productService.addProduct({
        ...testProduct,
        category: "",
      });
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe("category");
    });
  });

  describe("getProducts", () => {
    beforeEach(() => {
      // Add test products
      productService.addProduct({
        ...testProduct,
        name: "Cheap Product",
        price: 10,
        category: "Budget",
      });
      productService.addProduct({
        ...testProduct,
        name: "Expensive Product",
        price: 200,
        category: "Luxury",
      });
      productService.addProduct({
        ...testProduct,
        name: "Mid Product",
        price: 50,
        category: "Budget",
      });
    });

    it("should return paginated products", () => {
      const result = productService.getProducts(1, 2);
      expect(result.products.length).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.total).toBe(3);
    });

    it("should filter by category", () => {
      const result = productService.getProducts(1, 10, { category: "Budget" });
      expect(result.products.length).toBe(2);
      expect(result.products.every(p => p.category === "Budget")).toBe(true);
    });

    it("should filter by price range", () => {
      const result = productService.getProducts(1, 10, { minPrice: 20, maxPrice: 100 });
      expect(result.products.length).toBe(1);
      expect(result.products[0].name).toBe("Mid Product");
    });

    it("should filter by search term", () => {
      const result = productService.getProducts(1, 10, { searchTerm: "expensive" });
      expect(result.products.length).toBe(1);
      expect(result.products[0].name).toBe("Expensive Product");
    });

    it("should sort products", () => {
      const result = productService.getProducts(1, 10, undefined, "price", "desc");
      expect(result.products[0].price).toBe(200);
      expect(result.products[2].price).toBe(10);
    });
  });

  describe("updateProduct", () => {
    let productId: number;

    beforeEach(() => {
      const result = productService.addProduct(testProduct);
      productId = result.product!.id;
    });

    it("should update an existing product", () => {
      const updatedName = "Updated Product";
      const result = productService.updateProduct(productId, {
        ...testProduct,
        name: updatedName,
      });
      expect(result.product?.name).toBe(updatedName);
      expect(result.errors).toBeUndefined();
    });

    it("should validate updated product", () => {
      const result = productService.updateProduct(productId, {
        ...testProduct,
        name: "ab",
      });
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe("name");
    });

    it("should handle non-existent product", () => {
      const result = productService.updateProduct(-1, testProduct);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe("id");
    });
  });

  describe("deleteProduct", () => {
    it("should delete an existing product", () => {
      const result = productService.addProduct(testProduct);
      const productId = result.product!.id;
      
      expect(productService.deleteProduct(productId)).toBe(true);
      expect(productService.getAllProducts().find(p => p.id === productId)).toBeUndefined();
    });

    it("should return false for non-existent product", () => {
      expect(productService.deleteProduct(-1)).toBe(false);
    });
  });

  describe("getStatistics", () => {
    beforeEach(() => {
      productService.addProduct({
        ...testProduct,
        price: 10,
        category: "Budget",
      });
      productService.addProduct({
        ...testProduct,
        price: 20,
        category: "Budget",
      });
      productService.addProduct({
        ...testProduct,
        price: 30,
        category: "Luxury",
      });
    });

    it("should calculate correct statistics", () => {
      const stats = productService.getStatistics();
      expect(stats.totalProducts).toBe(3);
      expect(stats.averagePrice).toBe(20);
      expect(stats.minPrice).toBe(10);
      expect(stats.maxPrice).toBe(30);
      expect(Object.keys(stats.categoryCounts)).toContain("Budget");
      expect(Object.keys(stats.categoryCounts)).toContain("Luxury");
      expect(stats.categoryCounts["Budget"]).toBe(2);
      expect(stats.categoryCounts["Luxury"]).toBe(1);
    });
  });

  describe("getCategories", () => {
    it("should return unique categories", () => {
      productService.addProduct({
        ...testProduct,
        category: "Category1",
      });
      productService.addProduct({
        ...testProduct,
        category: "Category1",
      });
      productService.addProduct({
        ...testProduct,
        category: "Category2",
      });

      const categories = productService.getCategories();
      expect(categories.length).toBe(2);
      expect(categories).toContain("Category1");
      expect(categories).toContain("Category2");
    });
  });
});
