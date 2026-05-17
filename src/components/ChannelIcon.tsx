import { getChannelLogo } from '@/utils/channelLogos';
import { getChannels } from '@/services/channelManager';

interface ChannelIconProps {
  channelId: string;
  fallbackIcon?: string;
  logoUrl?: string;
  className?: string;
  size?: number;
}

export function ChannelIcon({ channelId, fallbackIcon, logoUrl, className, size = 20 }: ChannelIconProps) {
  // Priority: 1) explicit logoUrl prop, 2) channel config logoUrl, 3) built-in logo asset, 4) fallback emoji
  const channelConfig = getChannels().find(c => c.id === channelId);
  const configLogoUrl = channelConfig?.logoUrl;
  const builtInLogo = getChannelLogo(channelId);
  const src = logoUrl || configLogoUrl || builtInLogo;
  
  if (src) {
    return (
      <img 
        src={src} 
        alt={channelId} 
        className={className}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 4 }}
      />
    );
  }
  
  if (fallbackIcon) {
    return <span className={className}>{fallbackIcon}</span>;
  }
  
  return null;
}
