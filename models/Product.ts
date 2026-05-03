export interface Product {
  id: number;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  inStock?: boolean;
}
