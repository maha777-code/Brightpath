import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { FeedbackMenuButton } from '@/components/FeedbackMenuButton';
import { ProfileSettingsMenu } from '@/components/profile/ProfileSettingsMenu';
import { CYBER_FONT_STYLE } from '@/lib/theme';
import '@/styles/app-sidebar.css';

export type SidebarItem = {
  key: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
  active: boolean;
  to?: string;
  onClick?: () => void;
};

export type SidebarSection = {
  label?: string;
  items: SidebarItem[];
};

const COLLAPSED_KEY = 'mindvault.sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MV';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase();
}

function ItemContent({ item }: { item: SidebarItem }) {
  const Icon = item.icon;
  return (
    <>
      <Icon className="mv-sb-icon" aria-hidden="true" />
      <span className="mv-sb-label">
        <span className="mv-sb-label-main">{item.label}</span>
        {item.detail ? <span className="mv-sb-label-detail">{item.detail}</span> : null}
      </span>
    </>
  );
}

/** Shared left navigation for every signed-in workspace (teacher, student, parent, school, center). */
export function AppSidebar({
  title,
  sections,
  userName,
  userDetail,
  brandTo,
}: {
  title: string;
  sections: SidebarSection[];
  userName: string;
  userDetail?: string;
  brandTo?: string;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <div className="mv-sb-mobilebar md:hidden" style={CYBER_FONT_STYLE}>
        <button
          type="button"
          className="mv-sb-iconbtn"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <BrandLogo variant="full" to={brandTo} imgClassName="h-[2.8rem] w-auto" />
      </div>

      {mobileOpen ? (
        <button type="button" className="mv-sb-scrim md:hidden" aria-label="Close menu" onClick={closeMobile} />
      ) : null}

      <aside
        className="mv-sb"
        data-collapsed={collapsed ? 'true' : 'false'}
        data-mobile-open={mobileOpen ? 'true' : 'false'}
        style={CYBER_FONT_STYLE}
        aria-label={title}
      >
        <div className="mv-sb-head">
          <div className="mv-sb-brand">
            {collapsed ? (
              <span className="hidden md:block">
                <BrandLogo variant="compact" to={brandTo} imgClassName="h-[3.2rem] w-[3.2rem]" />
              </span>
            ) : null}
            <span className={collapsed ? 'md:hidden' : undefined}>
              <BrandLogo variant="full" to={brandTo} imgClassName="h-[3.2rem] w-auto" />
            </span>
          </div>
          <button
            type="button"
            className="mv-sb-iconbtn hidden md:inline-flex"
            aria-label={collapsed ? 'Show side menu' : 'Hide side menu'}
            title={collapsed ? 'Show side menu' : 'Hide side menu'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <button type="button" className="mv-sb-iconbtn md:hidden" aria-label="Close menu" onClick={closeMobile}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mv-sb-title">{title}</p>

        <nav className="mv-sb-nav" aria-label={title}>
          {sections.map((section, index) => (
            <div key={section.label ?? index} className="mv-sb-section">
              {section.label ? <p className="mv-sb-section-label">{section.label}</p> : null}
              {section.items.map((item) =>
                item.to ? (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    className="mv-sb-link"
                    data-active={item.active ? 'true' : undefined}
                    aria-current={item.active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    onClick={closeMobile}
                  >
                    <ItemContent item={item} />
                  </NavLink>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    className="mv-sb-link"
                    data-active={item.active ? 'true' : undefined}
                    aria-current={item.active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    onClick={() => {
                      item.onClick?.();
                      closeMobile();
                    }}
                  >
                    <ItemContent item={item} />
                  </button>
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="mv-sb-foot">
          <FeedbackMenuButton variant="menu" />
          <ProfileSettingsMenu />
          <div className="mv-sb-user" title={collapsed ? userName : undefined}>
            <span className="mv-sb-avatar" aria-hidden="true">
              {initials(userName)}
            </span>
            <span className="mv-sb-label">
              <span className="mv-sb-label-main">{userName}</span>
              {userDetail ? <span className="mv-sb-label-detail">{userDetail}</span> : null}
            </span>
          </div>
          <button
            type="button"
            className="mv-sb-link mv-sb-logout"
            title={collapsed ? 'Log out' : undefined}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut className="mv-sb-icon" aria-hidden="true" />
            <span className="mv-sb-label">
              <span className="mv-sb-label-main">Log out</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default AppSidebar;
