import { Link } from 'react-router-dom';

interface BottomNavProps {
  active: 'home' | 'progress';
}

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <Link to="/dashboard" className={`nav-item ${active === 'home' ? 'active' : ''}`}>
        <span>🏠</span>
        <span>Home</span>
      </Link>
      <Link to="/progress" className={`nav-item ${active === 'progress' ? 'active' : ''}`}>
        <span>📊</span>
        <span>Progress</span>
      </Link>
    </nav>
  );
}
