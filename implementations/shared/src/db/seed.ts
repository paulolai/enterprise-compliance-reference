import { db, close } from './index';
import { products } from './schema';

/**
 * Seed script for the shop database.
 *
 * This creates the 11 products from the product catalog used in the cartStore.
 * The seed is deterministic - it produces the same data every time.
 */

export const productsToSeed = [
  // Electronics (4 items)
  {
    sku: 'WIRELESS-EARBUDS',
    name: 'Wireless Earbuds',
    description: 'High-quality wireless earbuds with active noise cancellation.',
    priceInCents: 8900,
    weightInKg: 10, // Stored as int * 100
    category: 'Electronics',
  },
  {
    sku: 'SMART-WATCH',
    name: 'Smart Watch',
    description: 'Fitness tracking smartwatch with heart rate monitor.',
    priceInCents: 24900,
    weightInKg: 20,
    category: 'Electronics',
  },
  {
    sku: 'TABLET-10',
    name: '10" Tablet',
    description: '10-inch tablet with HD display and 64GB storage.',
    priceInCents: 44900,
    weightInKg: 50,
    category: 'Electronics',
  },
  {
    sku: 'LAPTOP-PRO',
    name: 'Pro Laptop',
    description: '14-inch Pro laptop with 16GB RAM and 512GB SSD.',
    priceInCents: 89900,
    weightInKg: 250,
    category: 'Electronics',
  },

  // Home (4 items)
  {
    sku: 'DESK-LAMP',
    name: 'LED Desk Lamp',
    description: 'Adjustable LED desk lamp with USB charging port.',
    priceInCents: 3500,
    weightInKg: 80,
    category: 'Home',
  },
  {
    sku: 'COFFEE-MAKER',
    name: 'Coffee Maker',
    description: 'Programmable 12-cup coffee maker with thermal carafe.',
    priceInCents: 8900,
    weightInKg: 250,
    category: 'Home',
  },
  {
    sku: 'THROW-BLANKET',
    name: 'Fleece Throw Blanket',
    description: 'Soft fleece throw blanket, 50" x 60".',
    priceInCents: 4500,
    weightInKg: 120,
    category: 'Home',
  },
  {
    sku: 'BATH-TOWEL-SET',
    name: 'Bath Towel Set',
    description: '6-piece bath towel set, premium cotton.',
    priceInCents: 12000,
    weightInKg: 280,
    category: 'Home',
  },

  // Clothing (3 items)
  {
    sku: 'T-SHIRT-BASIC',
    name: 'Basic T-Shirt',
    description: '100% cotton basic t-shirt in multiple colors.',
    priceInCents: 2500,
    weightInKg: 20,
    category: 'Clothing',
  },
  {
    sku: 'JEANS-SLIM',
    name: 'Slim Fit Jeans',
    description: 'Classic slim fit jeans with stretch comfort.',
    priceInCents: 6500,
    weightInKg: 50,
    category: 'Clothing',
  },
  {
    sku: 'HOODIE-ZIP',
    name: 'Zip-Up Hoodie',
    description: 'Comfortable zip-up hoodie with kangaroo pocket.',
    priceInCents: 7000,
    weightInKg: 60,
    category: 'Clothing',
  },
];

/**
 * Seed the products table.
 * This can be run to initially populate or re-seed the database.
 */
export async function seedProducts() {
  // Check if products already exist
  const existingProducts = await db.select().from(products);
  if (existingProducts.length > 0) {
    console.log('Products already seeded. Skipping.');
    return existingProducts.length;
  }

  // Insert all products
  await db.insert(products).values(productsToSeed);
  console.log(`Seeded ${productsToSeed.length} products.`);
  return productsToSeed.length;
}

/**
 * Clean and re-seed products.
 * WARNING: This deletes all existing products.
 */
export async function reseedProducts() {
  await db.delete(products);
  return seedProducts();
}

/**
 * Run seed script when executed directly.
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProducts()
    .then((count) => {
      console.log(`Seed complete. ${count} products in database.`);
      close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      close();
      process.exit(1);
    });
}
