import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PERMISSIONS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../utils/format';
import { Can } from '../common/Can';
import { RoleBadge } from '../common/StatusBadges';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Projects' },
  { to: '/tasks', label: 'My tasks' },
  { to: '/users', label: 'Users', permission: PERMISSIONS.USERS_READ },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="layout">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">✓</span> TaskFlow
        </div>
        <nav aria-label="Main">
          {NAV.map((item) => {
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            );
            return item.permission ? (
              <Can key={item.to} permission={item.permission}>
                {link}
              </Can>
            ) : (
              link
            );
          })}
        </nav>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ☰
          </button>
          <div className="topbar-user">
            <NavLink to="/profile" className="user-chip">
              <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
              <span className="user-name">{user.name}</span>
              <RoleBadge role={user.role} />
            </NavLink>
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
