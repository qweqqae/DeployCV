import { Hexagon } from 'lucide-react';

export function AppNav() {
  return (
    <nav className="app-nav">
      <div className="app-nav__logo">
        <div className="app-nav__logo-icon">
          <Hexagon size={18} />
        </div>
        <span>{import.meta.env.VITE_APP_NAME || 'Portfolio'}</span>
      </div>
      <span className="app-nav__tag">Mini App</span>
    </nav>
  );
}
