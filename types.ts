export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  imageUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  date: string; // ISO string
  paymentMethod: 'cash' | 'card' | 'pix' | 'pending' | 'ifood';
  observation?: string;
}

export interface SalesSummary {
  totalRevenue: number;
  totalSales: number;
  topSellingProduct: string;
  lowStockCount: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  AI_ASSISTANT = 'AI_ASSISTANT'
}