import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الداكن';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-xl border border-slate-700 text-amber-300 transition-all duration-200 ease-out hover:border-amber-400/50 hover:text-amber-200 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${className}`}
    >
      <Sun aria-hidden="true" className="theme-icon-sun h-4 w-4" />
      <Moon aria-hidden="true" className="theme-icon-moon h-4 w-4" />
    </button>
  );
}
