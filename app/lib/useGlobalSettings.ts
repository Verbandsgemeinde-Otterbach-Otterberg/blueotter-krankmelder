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
        const res = await fetch('/api/public-settings');
        const data = await res.json();
        if (data.success && data.data) {
          setSettings({
            appName: data.data.appName || settings.appName,
            appSlogan: data.data.appSlogan || settings.appSlogan,
            globalSbEmail: '',
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
