import { formatCurrency } from '../../../../shared/src';

interface PriceDisplayProps {
  amount: number; // cents
  label?: string;
  showZero?: boolean;
  testId?: string;
}

export function PriceDisplay({ amount, label, showZero = true, testId }: PriceDisplayProps) {
  if (!showZero && amount === 0) {
    return null;
  }

  const defaultTestId = `price-display-${label?.toLowerCase().replace(/\s+/g, '-') || 'amount'}`;

  return (
    <span className="price-display" data-testid={testId || defaultTestId}>
      {label && <span className="price-label">{label}: </span>}
      <span className="price-value">{formatCurrency(amount)}</span>
    </span>
  );
}
