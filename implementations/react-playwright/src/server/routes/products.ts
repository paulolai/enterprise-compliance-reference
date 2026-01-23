import { Hono } from 'hono';
import { logger } from '../../lib/logger';
import { db, seedProducts } from '../../../../shared/src/index-server';
import { products } from '../../../../shared/src/index-server';
import { eq } from 'drizzle-orm';

const router = new Hono();

/**
 * GET /api/products
 * Get all products in the catalog
 */
router.get('/', async (c) => {
  try {
    // Ensure products are seeded (idempotent)
    await seedProducts();

    // Get all products
    const allProducts = await db.select().from(products);

    return c.json({
      products: allProducts.map((product) => ({
        sku: product.sku,
        name: product.name,
        description: product.description,
        priceInCents: product.priceInCents,
        weightInKg: product.weightInKg / 100, // Convert from int*100 back to float
        category: product.category,
      })),
    });
  } catch (error) {
    logger.error('Products retrieval failed', error, { action: 'list_products' });
    return c.json({ error: 'Failed to retrieve products' }, 500);
  }
});

/**
 * GET /api/products/:sku
 * Get a single product by SKU
 */
router.get('/:sku', async (c) => {
  try {
    const sku = c.req.param('sku');

    const productResults = await db.select().from(products).where(eq(products.sku, sku));

    if (productResults.length === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }

    const product = productResults[0];

    return c.json({
      sku: product.sku,
      name: product.name,
      description: product.description,
      priceInCents: product.priceInCents,
      weightInKg: product.weightInKg / 100,
      category: product.category,
      imageUrl: product.imageUrl,
    });
  } catch (error) {
    logger.error('Product retrieval failed', error, { action: 'get_product' });
    return c.json({ error: 'Failed to retrieve product' }, 500);
  }
});

export { router as productsRouter };
