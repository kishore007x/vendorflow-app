import amazonLogo from '@/assets/channels/amazon.png';
import flipkartLogo from '@/assets/channels/flipkart.png';
import meeshoLogo from '@/assets/channels/meesho.png';
import firstcryLogo from '@/assets/channels/firstcry.png';
import blinkitLogo from '@/assets/channels/blinkit.png';
import myntraLogo from '@/assets/channels/myntra.png';
import nykaaLogo from '@/assets/channels/nykaa.png';
import ajioLogo from '@/assets/channels/ajio.png';
import ownWebsiteLogo from '@/assets/channels/own_website.png';

export const channelLogos: Record<string, string> = {
  amazon: amazonLogo,
  flipkart: flipkartLogo,
  meesho: meeshoLogo,
  firstcry: firstcryLogo,
  blinkit: blinkitLogo,
  myntra: myntraLogo,
  nykaa: nykaaLogo,
  ajio: ajioLogo,
  own_website: ownWebsiteLogo,
};

export function getChannelLogo(channelId: string): string | null {
  return channelLogos[channelId] || null;
}
