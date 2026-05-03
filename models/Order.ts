import { CartItem } from './Cart';

export interface Order {
  id: number;
  userId: number;
  status: string;
  items: CartItem[];
  totalAmount: number;
  createdAt: string;
}
