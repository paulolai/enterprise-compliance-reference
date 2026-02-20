import type { CartItem } from '@executable-specs/shared';

export interface LineItem {
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export function mapCartToLineItems(items: CartItem[]): LineItem[] {
  return items.map(item => ({
    sku: item.sku,
    name: item.name,
    unitPrice: item.price,
    quantity: item.quantity,
  }));
}

export function validateOrderInvariants(items: CartItem[]): boolean {
  return items.every(item => 
    item.sku && 
    item.name && 
    item.price > 0 && 
    item.quantity > 0 &&
    item.weightInKg >= 0
  );
}
