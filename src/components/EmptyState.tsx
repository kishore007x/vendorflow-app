import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryPath?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionPath,
  onAction,
  secondaryLabel,
  secondaryPath,
}: EmptyStateProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      <div className="flex items-center gap-3">
        {actionLabel && (
          <Button
            onClick={onAction || (actionPath ? () => navigate(actionPath) : undefined)}
            className="gap-2"
          >
            {actionLabel}
          </Button>
        )}
        {secondaryLabel && secondaryPath && (
          <Button variant="outline" onClick={() => navigate(secondaryPath)}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
