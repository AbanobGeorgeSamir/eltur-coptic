import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function FloatingWhatsApp() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    api.contact().then((contact) => setUrl(contact.whatsappUrl || '')).catch(() => setUrl(''));
  }, []);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      aria-label="تواصل معنا عبر واتساب"
      title="واتساب"
      className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 z-40 grid h-14 w-14 place-items-center rounded-full border-2 border-emerald-300/40 bg-emerald-600 text-white shadow-2xl transition-colors hover:bg-emerald-500 sm:bottom-6 sm:left-6 sm:h-16 sm:w-16"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M20.52 3.48A11.8 11.8 0 0 0 12.1 0C5.55 0 .22 5.33.22 11.9c0 2.1.55 4.15 1.6 5.95L.12 24l6.32-1.66a11.9 11.9 0 0 0 5.66 1.44h.01c6.56 0 11.9-5.34 11.9-11.9a11.8 11.8 0 0 0-3.49-8.4ZM12.1 21.75h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.22-3.75.99 1-3.65-.23-.38a9.86 9.86 0 0 1-1.51-5.22C2.22 6.65 6.66 2.2 12.1 2.2a9.85 9.85 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7c0 5.45-4.44 9.9-9.9 9.9Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.23-.64.08-.3-.15-1.26-.47-2.4-1.48-.89-.78-1.48-1.75-1.66-2.05-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.09 3.2 5.07 4.49.71.3 1.26.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
