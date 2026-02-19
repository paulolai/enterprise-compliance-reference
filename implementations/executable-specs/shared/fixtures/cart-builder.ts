import type { CartItem, User, PricingResult, Cents } from '../src/types';
import { PricingEngine } from '../src/pricing-engine';
import { ShippingMethod } from '../src/types';

// Simple tracer interface for optional logging
export interface Tracer {
  log(testName: string, input: any, output: any): void;
}

export interface ItemBuilderParams {
  name: string;
  price: Cents;
  quantity?: number;
  sku?: string;
  weightInKg?: number;
}

export class CartBuilder {
  private items: CartItem[] = [];
  private user: User = { tenureYears: 0 };
  private shippingMethod: ShippingMethod = ShippingMethod.STANDARD;
  private tracer: Tracer | null = null;

  static new(): CartBuilder {
    return new CartBuilder();
  }

  withTracer(tracer: Tracer): CartBuilder {
    this.tracer = tracer;
    return this;
  }

  withItem(params: ItemBuilderParams): CartBuilder {
    const { name, price, quantity = 1, sku, weightInKg = 1.0 } = params;
    this.items.push({
      sku: sku || name.toUpperCase().replace(/\s+/g, '_'),
      name,
      price,
      quantity,
      weightInKg
    });
    return this;
  }

  asVipUser(): CartBuilder {
    this.user.tenureYears = 3;
    return this;
  }

  withTenure(years: number): CartBuilder {
    this.user.tenureYears = years;
    return this;
  }

  withShipping(method: ShippingMethod): CartBuilder {
    this.shippingMethod = method;
    return this;
  }

  withStandardShipping(): CartBuilder {
    return this.withShipping(ShippingMethod.STANDARD);
  }

  withExpeditedShipping(): CartBuilder {
    return this.withShipping(ShippingMethod.EXPEDITED);
  }

  withExpressShipping(): CartBuilder {
    return this.withShipping(ShippingMethod.EXPRESS);
  }

  calculate(testName?: string): PricingResult {
    const input = { items: this.items, user: this.user, shippingMethod: this.shippingMethod };
    const output = PricingEngine.calculate(this.items, this.user, this.shippingMethod);

    if (testName && this.tracer) {
      this.tracer.log(testName, input, output);
    }

    return output;
  }

  // Helper for reporter to see inputs
  getInputs() {
    return {
      items: this.items,
      user: this.user,
      shippingMethod: this.shippingMethod
    };
  }
}
