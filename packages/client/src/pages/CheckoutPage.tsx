import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart-store';
import { ShippingMethodSelector } from '../components/checkout/ShippingMethodSelector';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '../lib/logger';

interface ValidationErrors {
  fullName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvc?: string;
}

function validateFullName(value: string): string | undefined {
  if (!value) return 'Full name is required';
  if (value.length < 2) return 'Full name must be at least 2 characters';
  return undefined;
}

function validateRequired(value: string, fieldName: string): string | undefined {
  if (!value) return `${fieldName} is required`;
  return undefined;
}

function validateZipCode(value: string): string | undefined {
  if (!value) return 'ZIP code is required';
  if (value.length < 4) return 'ZIP code must be at least 4 characters';
  return undefined;
}

function validateCardNumber(value: string): string | undefined {
  if (!value || value.length < 13) return 'Card number must be at least 13 digits';
  return undefined;
}

function validateExpiryDate(value: string): string | undefined {
  if (!value) return 'Expiry date is required';
  if (!/^\d{2}\/\d{2}$/.test(value)) return 'Expiry date must be in MM/YY format';
  return undefined;
}

function validateCvc(value: string): string | undefined {
  if (!value) return 'CVC is required';
  if (value.length < 3) return 'CVC must be at least 3 digits';
  return undefined;
}

export function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const shippingMethod = useCartStore((state) => state.shippingMethod);
  const user = useCartStore((state) => state.user);
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [pricingError, setPricingError] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);

  // Form state - controlled inputs
  const [fullName, setFullName] = React.useState('');
  const [streetAddress, setStreetAddress] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [zipCode, setZipCode] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState('');
  const [cvc, setCvc] = React.useState('');

  // Validation state
  const [validationErrors, setValidationErrors] = React.useState<ValidationErrors>({});

  // Fetch pricing when shipping method changes
  React.useEffect(() => {
    const controller = new AbortController();
    setPricingError(false);
    
    const fetchPricing = async () => {
      if (items.length === 0) {
        navigate('/cart');
        return;
      }

      try {
        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            user: user || { tenureYears: 0 },
            method: shippingMethod,
          }),
          signal: controller.signal,
        });

        if (response.ok) {
          const result = await response.json();
          useCartStore.setState({ pricingResult: result });
          setPricingError(false);
        } else {
          setPricingError(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        logger.error('Pricing fetch failed', error, { page: 'checkout' });
        setPricingError(true);
      }
    };

    fetchPricing();

    return () => {
      controller.abort();
    };
  }, [items, user, shippingMethod, navigate]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    const nameError = validateFullName(fullName);
    if (nameError) errors.fullName = nameError;

    const addressError = validateRequired(streetAddress, 'Street address');
    if (addressError) errors.streetAddress = addressError;

    const cityError = validateRequired(city, 'City');
    if (cityError) errors.city = cityError;

    const stateError = validateRequired(state, 'State');
    if (stateError) errors.state = stateError;

    const zipError = validateZipCode(zipCode);
    if (zipError) errors.zipCode = zipError;

    const cardError = validateCardNumber(cardNumber);
    if (cardError) errors.cardNumber = cardError;

    const expiryError = validateExpiryDate(expiryDate);
    if (expiryError) errors.expiryDate = expiryError;

    const cvcError = validateCvc(cvc);
    if (cvcError) errors.cvc = cvcError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);

    try {
      const store = useCartStore.getState();
      const pricingResult = store.pricingResult;

      if (!pricingResult) {
        setOrderError('Pricing data is missing. Please refresh the page.');
        setIsPlacingOrder(false);
        return;
      }

      const userId = user?.email ?? `guest_${crypto.randomUUID()}`;

      const orderPayload = {
        userId,
        items: store.items.map((item) => ({
          sku: item.sku,
          name: item.name,
          priceInCents: item.price,
          quantity: item.quantity,
          weightInKg: item.weightInKg,
        })),
        total: pricingResult.grandTotal,
        pricingResult,
        shippingAddress: {
          fullName,
          streetAddress,
          city,
          state,
          zipCode,
        },
        stripePaymentIntentId: crypto.randomUUID(),
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        setOrderError(data.error ?? 'Failed to place order. Please try again.');
        setIsPlacingOrder(false);
        return;
      }

      store.clear();
      navigate(`/order-confirmation/${data.orderId}`);
    } catch (error) {
      logger.error('Order submission failed', error, { page: 'checkout' });
      setOrderError('Network error. Please check your connection and try again.');
      setIsPlacingOrder(false);
    }
  };

  const clearError = (field: keyof ValidationErrors) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isOrderDisabled = isPlacingOrder || items.length === 0 || pricingError;

  return (
    <div className="space-y-8" data-testid="checkout-page">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        {user?.tenureYears && user.tenureYears > 2 && (
          <Badge variant="vip" data-testid="vip-user-label">
            VIP Member ({user.tenureYears} years)
          </Badge>
        )}
      </div>

      {pricingError && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4" />
          Unable to calculate pricing. Please try again later.
        </div>
      )}

      {orderError && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {orderError}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        <div className="space-y-6">
          {/* Shipping Method */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Method</CardTitle>
            </CardHeader>
            <CardContent>
              <ShippingMethodSelector />
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form noValidate>
                <div className="space-y-2">
                  <Label htmlFor="shipping-name">Full Name</Label>
                  <Input
                    type="text"
                    id="shipping-name"
                    placeholder="Full Name"
                    data-testid="shipping-name"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearError('fullName'); }}
                    aria-invalid={!!validationErrors.fullName}
                    aria-describedby={validationErrors.fullName ? 'fullname-error' : undefined}
                  />
                  {validationErrors.fullName && (
                    <p id="fullname-error" className="text-sm text-destructive" data-testid="fullname-error">
                      {validationErrors.fullName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-address">Street Address</Label>
                  <Input
                    type="text"
                    id="shipping-address"
                    placeholder="Street Address"
                    data-testid="shipping-address"
                    value={streetAddress}
                    onChange={(e) => { setStreetAddress(e.target.value); clearError('streetAddress'); }}
                    aria-invalid={!!validationErrors.streetAddress}
                    aria-describedby={validationErrors.streetAddress ? 'address-error' : undefined}
                  />
                  {validationErrors.streetAddress && (
                    <p id="address-error" className="text-sm text-destructive" data-testid="address-error">
                      {validationErrors.streetAddress}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-city">City</Label>
                  <Input
                    type="text"
                    id="shipping-city"
                    placeholder="City"
                    data-testid="shipping-city"
                    value={city}
                    onChange={(e) => { setCity(e.target.value); clearError('city'); }}
                    aria-invalid={!!validationErrors.city}
                    aria-describedby={validationErrors.city ? 'city-error' : undefined}
                  />
                  {validationErrors.city && (
                    <p id="city-error" className="text-sm text-destructive" data-testid="city-error">
                      {validationErrors.city}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping-state">State</Label>
                    <Input
                      type="text"
                      id="shipping-state"
                      placeholder="State"
                      value={state}
                      onChange={(e) => { setState(e.target.value); clearError('state'); }}
                      aria-invalid={!!validationErrors.state}
                      aria-describedby={validationErrors.state ? 'state-error' : undefined}
                    />
                    {validationErrors.state && (
                      <p id="state-error" className="text-sm text-destructive" data-testid="state-error">
                        {validationErrors.state}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping-zip">ZIP Code</Label>
                    <Input
                      type="text"
                      id="shipping-zip"
                      placeholder="ZIP Code"
                      value={zipCode}
                      onChange={(e) => { setZipCode(e.target.value); clearError('zipCode'); }}
                      aria-invalid={!!validationErrors.zipCode}
                      aria-describedby={validationErrors.zipCode ? 'zip-error' : undefined}
                    />
                    {validationErrors.zipCode && (
                      <p id="zip-error" className="text-sm text-destructive" data-testid="zip-error">
                        {validationErrors.zipCode}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form noValidate>
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    type="text"
                    id="card-number"
                    placeholder="Card Number"
                    data-testid="card-number"
                    value={cardNumber}
                    onChange={(e) => { setCardNumber(e.target.value); clearError('cardNumber'); }}
                    aria-invalid={!!validationErrors.cardNumber}
                    aria-describedby={validationErrors.cardNumber ? 'card-error' : undefined}
                  />
                  {validationErrors.cardNumber && (
                    <p id="card-error" className="text-sm text-destructive" data-testid="card-error">
                      {validationErrors.cardNumber}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-expiry">Expiry Date (MM/YY)</Label>
                    <Input
                      type="text"
                      id="card-expiry"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => { setExpiryDate(e.target.value); clearError('expiryDate'); }}
                      aria-invalid={!!validationErrors.expiryDate}
                      aria-describedby={validationErrors.expiryDate ? 'expiry-error' : undefined}
                    />
                    {validationErrors.expiryDate && (
                      <p id="expiry-error" className="text-sm text-destructive" data-testid="expiry-error">
                        {validationErrors.expiryDate}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-cvc">CVC</Label>
                    <Input
                      type="text"
                      id="card-cvc"
                      placeholder="CVC"
                      value={cvc}
                      onChange={(e) => { setCvc(e.target.value); clearError('cvc'); }}
                      aria-invalid={!!validationErrors.cvc}
                      aria-describedby={validationErrors.cvc ? 'cvc-error' : undefined}
                    />
                    {validationErrors.cvc && (
                      <p id="cvc-error" className="text-sm text-destructive" data-testid="cvc-error">
                        {validationErrors.cvc}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <OrderSummary />
          <Button
            size="lg"
            className="w-full"
            onClick={handlePlaceOrder}
            disabled={isOrderDisabled}
            data-testid="place-order-button"
          >
            {isPlacingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
