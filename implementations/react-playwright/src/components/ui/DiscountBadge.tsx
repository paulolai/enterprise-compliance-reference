interface DiscountBadgeProps {
  amount: number; // cents
  variant?: 'bulk' | 'vip' | 'total';
  sku?: string;
}

export function DiscountBadge({ amount, variant = 'bulk', sku }: DiscountBadgeProps) {
  if (amount <= 0) return null;

  const labels = {
    bulk: 'Bulk Discount',
    vip: 'VIP Discount',
    total: 'Total Discount',
  };

  const testId = sku ? `bulk-badge-${sku}` : `discount-badge-${variant}`;

  return (
    <span className="discount-badge" data-testid={testId}>
      {labels[variant]}: {`-$${(amount / 100).toFixed(2)}`}
    </span>
  );
}
