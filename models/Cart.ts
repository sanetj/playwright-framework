export interface CartItem {
  itemId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Cart {
  id: number;
  userId?: number;
  items: CartItem[];
  totalAmount: number;
}
