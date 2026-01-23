import { Page } from '@playwright/test';
import { CartBuilder } from '@executable-specs/shared/fixtures';
import { ShippingMethod, CartItem, User, PricingResult, PricingEngine } from '@executable-specs/shared';

/**
 * PageBuilder
 * 
 * Uses the Builder pattern to construct the entire application state
 * and inject it into the browser via "Seams" (localStorage), bypassing
 * slow UI interactions for test setup.
 * 
 * Usage:
 * await PageBuilder.new()
 *   .withItem({ name: 'iPad', price: 100000, sku: 'IPAD' })
 *   .asVipUser()
 *   .setup(page);
 */
export class PageBuilder {
  private cartBuilder: CartBuilder;

  private constructor() {
    this.cartBuilder = CartBuilder.new();
  }

  static new(): PageBuilder {
    return new PageBuilder();
  }

  // Delegate cart configuration to the shared CartBuilder
  withItem(params: { name: string; price: number; quantity?: number; sku?: string; weightInKg?: number }): PageBuilder {
    this.cartBuilder.withItem(params);
    return this;
  }

  asVipUser(): PageBuilder {
    this.cartBuilder.asVipUser();
    return this;
  }

  withTenure(years: number): PageBuilder {
    this.cartBuilder.withTenure(years);
    return this;
  }

  withShipping(method: ShippingMethod): PageBuilder {
    this.cartBuilder.withShipping(method);
    return this;
  }

      // Inject the constructed state into the page
      async setup(page: Page): Promise<void> {
        const inputs = this.cartBuilder.getInputs();
        
        // Calculate expected pricing so the seeded state is consistent
        const pricingResult = PricingEngine.calculate(
          inputs.items,
          inputs.user,
          inputs.shippingMethod
        );
  
        const cartState = {
          items: inputs.items.map(item => ({
            ...item,
            addedAt: Date.now()
          })),
          user: inputs.user.tenureYears > 0 ? inputs.user : null,
          shippingMethod: inputs.shippingMethod,
          pricingResult: pricingResult
        };
  
        const cartStorageState = {
          state: cartState,
          version: 0
        };
  
        // Construct auth state if user has tenure (implying they are a registered user)
        const authUser = inputs.user.tenureYears > 0 ? {
          name: 'Test User',
          email: 'test@example.com',
          tenureYears: inputs.user.tenureYears
        } : null;
  
        // Use addInitScript to ensure storage is set before any code runs
        await page.addInitScript(({ cartData, userData }) => {
          window.localStorage.setItem('cart-storage', JSON.stringify(cartData));
          
          if (userData) {
            window.localStorage.setItem('auth_user', JSON.stringify(userData));
            window.localStorage.setItem('auth_token', 'mock-token-from-builder');
          } else {
            window.localStorage.removeItem('auth_user');
            window.localStorage.removeItem('auth_token');
          }
        }, { cartData: cartStorageState, userData: authUser });
      }
    }
