import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';

const notificationId = (item) => item?._id || item?.id || '';

export default function BrowserNotificationWatcher({ userId }) {
  const location = useLocation();

  useEffect(() => {
    if (!userId || location.pathname === '/notifications' || typeof window === 'undefined'
      || !('Notification' in window) || window.Notification.permission !== 'granted') {
      return undefined;
    }

    let active = true;
    let latestId = '';
    let timer;

    const poll = async () => {
      try {
        const preferences = await api.notificationPreferences();
        if (!active || preferences.verseUpdates === false) return;
        const items = await api.notifications();
        if (!active) return;
        const latest = items[0];
        const id = notificationId(latest);
        if (id && latestId && id !== latestId) {
          try {
            new window.Notification(latest.title || 'تحديث جديد للآية', {
              body: [latest.reference, latest.text].filter(Boolean).join(' · '),
              tag: id,
            });
          } catch {
            // Browser notification permission can change while the app is open.
          }
        }
        if (id) latestId = id;
      } catch {
        // Retry on the next interval while keeping the current page available.
      }
    };

    const initialize = async () => {
      try {
        const [preferences, items] = await Promise.all([
          api.notificationPreferences(),
          api.notifications(),
        ]);
        if (!active || preferences.verseUpdates === false) return;
        latestId = notificationId(items[0]);
        timer = window.setInterval(poll, 60_000);
      } catch {
        // Retry on the next authenticated navigation.
      }
    };

    void initialize();
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [location.pathname, userId]);

  return null;
}
