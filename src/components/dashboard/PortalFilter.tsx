import { useSyncExternalStore } from 'react';
import { Portal } from '@/types';
import { getChannels, subscribeChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface PortalFilterProps {
  selectedPortal: Portal | 'all';
  onPortalChange: (portal: Portal | 'all') => void;
  className?: string;
}

export function PortalFilter({ selectedPortal, onPortalChange, className }: PortalFilterProps) {
  const channels = useSyncExternalStore(subscribeChannels, getChannels);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <button
        onClick={() => onPortalChange('all')}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
          selectedPortal === 'all'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted'
        )}
      >
        {selectedPortal === 'all' && <Check className="w-4 h-4 text-primary" />}
        {selectedPortal !== 'all' && <span className="w-4" />}
        <span>All Channels</span>
      </button>
      
      {channels.map((portal) => (
        <button
          key={portal.id}
          onClick={() => onPortalChange(portal.id)}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
            selectedPortal === portal.id
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          {selectedPortal === portal.id && <Check className="w-4 h-4 text-primary" />}
          {selectedPortal !== portal.id && <span className="w-4" />}
          <ChannelIcon channelId={portal.id} fallbackIcon={portal.icon} logoUrl={portal.logoUrl} size={20} />
          <span>{portal.name}</span>
        </button>
      ))}
    </div>
  );
}
