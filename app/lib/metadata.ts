import { getGlobalSetting } from '@/app/lib/db';

export async function getAppMetadata() {
  const appName = getGlobalSetting('NEXT_PUBLIC_APP_NAME') || process.env.NEXT_PUBLIC_APP_NAME || '';
  const appSlogan = getGlobalSetting('NEXT_PUBLIC_APP_SLOGAN') || process.env.NEXT_PUBLIC_APP_SLOGAN || '';
  
  return {
    appName,
    appSlogan,
  };
}
