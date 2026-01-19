import { formatCurrency } from '../../../../shared/src';

interface PriceDisplayProps {
  amount: number; // cents
  label?: string;
  showZero?: boolean;
}

export function PriceDisplay({ amount, label, showZero = true }: PriceDisplayProps) {
  if (!showZero && amount === 0) {
    return null;
  }

  return (
    <span className="price-display" data-testid={`price-display-${label?.toLowerCase().replace(/\\s+/g, '-') || 'amount'}`}>
      {label && <span className="price-label">{label}: </span>}
      <span className="price-value">{formatCurrency(amount)}</span>
    </span>
  );
}
