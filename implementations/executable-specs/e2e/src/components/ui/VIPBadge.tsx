interface VIPBadgeProps {
  isVisible: boolean;
}

export function VIPBadge({ isVisible }: VIPBadgeProps) {
  if (!isVisible) return null;

  return (
    <span className="vip-badge" data-testid="vip-badge">
      VIP Member
    </span>
  );
}
