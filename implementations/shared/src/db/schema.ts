import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Database Schema for Shop Application
 *
 * This schema follows the domain specifications in docs/specs/stories/04-order-persistence.md
 */

/**
 * Orders Table
 *
 * Represents a completed purchase with payment confirmed.
 * All monetary values are stored in cents (integer).
 */
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  status: text('status', {
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']
  }).notNull().default('pending'),
  total: integer('total').notNull(), // Final amount in cents
  pricingResult: text('pricing_result').notNull(), // JSON string of PricingResult
  shippingAddress: text('shipping_address').notNull(), // JSON string
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Order Items Table
 *
 * Line items that belong to an order.
 * Cascades delete when parent order is deleted.
 */
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull(),
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(), // Price AT PURCHASE (cents), preserved
  weightInKg: integer('weight_in_kg').notNull(), // For historical record (stored as integer * 100 for precision)
  discount: integer('discount').notNull().default(0), // Total discount on this line (cents)
  createdAt: integer('created_at').notNull(),
});

/**
 * Products Table
 *
 * Product catalog for the shop.
 * Prices are in cents.
 */
export const products = sqliteTable('products', {
  sku: text('sku').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  priceInCents: integer('price_in_cents').notNull(), // Current list price (cents)
  weightInKg: integer('weight_in_kg').notNull(), // Stored as integer * 100 for precision
  category: text('category').notNull(),
  imageUrl: text('image_url'),
});

/**
 * Type exports for TypeScript
 */
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;