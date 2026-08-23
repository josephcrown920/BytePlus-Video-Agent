import * as Clipboard from 'expo-clipboard';
import { createShareLink } from '@workspace/api-client-react';

export type ShareableContentType = 'script' | 'storyboard';

export async function copyShareLink(
  type: ShareableContentType,
  data: Record<string, unknown>,
): Promise<string> {
  const { url } = await createShareLink({ type, data });
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!domain) throw new Error('Share links are unavailable until the app is connected');

  const shareUrl = `https://${domain}${url}`;
  await Clipboard.setStringAsync(shareUrl);
  return shareUrl;
}