import { useEffect, useState } from 'react';

interface GlobalSettings {
  appName: string;
  appSlogan: string;
  globalSbEmail?: string;
}

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>({
    appName: 'Verbandsgemeinde Otterbach-Otterberg',
    appSlogan: 'Krankmeldungssystem',
    globalSbEmail: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/global-settings');
        const data = await res.json();
        if (data.success && data.data) {
          setSettings({
            appName: data.data.app_name?.value || settings.appName,
            appSlogan: data.data.app_slogan?.value || settings.appSlogan,
            globalSbEmail: data.data.global_sb_email?.value || '',
          });
        }
      } catch (err) {
        console.error('Error loading global settings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { ...settings, loading };
}
