import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, ChevronRight, CreditCard, LogOut, Moon, Settings, Sparkles, SunMedium } from 'lucide-react';
import { useColorTheme, type ColorTheme } from '@/context/ColorTheme';
import { useAuth } from '@/context/AuthContext';
import { useDisplayUser } from '@/lib/displayUser';
import { api } from '@/lib/api';
import { PRICING_PLANS } from '@/pages/pricingData';

const THEMES: { id: ColorTheme; label: string; icon: typeof SunMedium }[] = [
  { id: 'light', label: 'Light', icon: SunMedium },
  { id: 'dark', label: 'Dark', icon: Moon },
];

const BASIC_PLANS = new Set(['free', 'teacher_free', 'student_free', 'parent_free']);

const PLAN_CATALOG: Record<string, string> = {
  free: 'teacher-free',
  teacher_free: 'teacher-free',
  teacher_pro: 'teacher-pro',
  student_free: 'student-free',
  student_pro: 'student-pro',
  parent_free: 'parent-free',
  family_plan: 'parent-pro',
  tutor_center_pro: 'tutor-center-pro',
  school_enterprise: 'school',
};

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  org_admin: 'School admin',
  center_admin: 'Center admin',
};

const ADMIN_SETTINGS: Record<string, { label: string; path: string }> = {
  org_admin: { label: 'School settings', path: '/admin/school-dashboard/settings' },
  center_admin: { label: 'Center settings', path: '/admin/center-dashboard/settings' },
};

function isBasicPlan(plan: string | null | undefined) {
  return !plan || BASIC_PLANS.has(plan);
}

function planTitle(planType: string | null | undefined) {
  const catalogId = PLAN_CATALOG[planType ?? ''] ?? '';
  return PRICING_PLANS.find((item) => item.id === catalogId)?.title ?? (isBasicPlan(planType) ? 'Free plan' : 'Current plan');
}

function intervalCopy(interval: string | null | undefined) {
  if (interval === 'yearly' || interval === 'annual') return 'Billed yearly';
  if (interval === 'monthly') return 'Billed monthly';
  return null;
}

function resetCopy(iso: string | null | undefined) {
  if (!iso) return 'Renewal date appears after the first successful payment.';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Renewal date appears after the first successful payment.';
  const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Renews on ${formatted} (${days} day${days === 1 ? '' : 's'})`;
}

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MV';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

function MenuRow({
  icon,
  tone,
  label,
  detail,
  onClick,
}: {
  icon: ReactNode;
  tone: 'blue' | 'violet' | 'pink' | 'amber';
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" role="menuitem" className="mv-acct-row" onClick={onClick}>
      <span className="mv-acct-tile" data-tone={tone}>
        {icon}
      </span>
      <span className="mv-acct-row-text">
        <span className="mv-acct-row-label">{label}</span>
        {detail ? <span className="mv-acct-row-detail">{detail}</span> : null}
      </span>
      <ChevronRight className="mv-acct-chevron h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  );
}

export function ProfileSettingsMenu({ expand = 'up' }: { expand?: 'up' | 'down' }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useColorTheme();
  const { user, teacher, parent, organization, role, planType, logout } = useAuth();
  const { userName, schoolName } = useDisplayUser();
  const [open, setOpen] = useState(false);
  const [billing, setBilling] = useState<{ interval: string | null; nextBillingDate: string | null; planType: string | null } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const activePlan = billing?.planType ?? organization?.planType ?? planType ?? user?.planType ?? null;
  const basic = isBasicPlan(activePlan);

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    api
      .paymentStatus()
      .then((res) => {
        if (cancelled) return;
        setBilling({
          interval: res.billingInterval ?? null,
          nextBillingDate: res.nextBillingDate ?? null,
          planType: res.planType ?? null,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goPricing = () => navigate('/pricing');
  const title = planTitle(activePlan);
  const interval = intervalCopy(billing?.interval);
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const email = user?.email || teacher?.email || parent?.email || '';
  const subject = teacher?.subjectFocus?.trim();
  const school = organization?.name || schoolName;
  const adminSettings = ADMIN_SETTINGS[role ?? ''];

  const manage = async () => {
    try {
      const { url } = await api.openDodoPortal();
      window.location.assign(url);
    } catch {
      goPricing();
    }
  };

  return (
    <div ref={rootRef} className="mv-settings mb-3 px-3" data-expand={expand}>
      {basic ? (
        <button type="button" className="mv-upgrade-btn" onClick={goPricing}>
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          Upgrade to Pro
        </button>
      ) : null}
      <button
        type="button"
        className="mv-settings-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Settings className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">Settings</span>
      </button>

      {open ? (
        <div id={menuId} className="mv-acct" role="menu" aria-label="Account and settings">
          <div className="mv-acct-head">
            <span className="mv-acct-avatar" aria-hidden="true">
              {initials(userName)}
            </span>
            <div className="mv-acct-id">
              <p className="mv-acct-name">{userName}</p>
              {email ? <p className="mv-acct-email">{email}</p> : null}
            </div>
            <span className="mv-acct-badge" data-pro={basic ? undefined : ''}>
              {basic ? null : <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />}
              {title}
            </span>
          </div>

          <dl className="mv-acct-facts">
            <div>
              <dt>Role</dt>
              <dd>{ROLE_LABEL[role ?? ''] ?? role ?? '—'}</dd>
            </div>
            {school ? (
              <div>
                <dt>School</dt>
                <dd>{school}</dd>
              </div>
            ) : null}
            {subject ? (
              <div>
                <dt>Subject</dt>
                <dd>{subject}</dd>
              </div>
            ) : null}
            <div>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </div>
          </dl>

          <div className="mv-acct-plan">
            <p className="mv-acct-plan-kicker">Plan &amp; billing</p>
            <p className="mv-acct-plan-title">
              {title}
              {interval ? <span>{interval}</span> : null}
            </p>
            <p className="mv-acct-plan-meta">
              {basic ? 'Free plan, no renewal charge.' : resetCopy(billing?.nextBillingDate)}
            </p>
            <button type="button" className="mv-acct-plan-link" onClick={basic ? goPricing : () => void manage()}>
              {basic ? 'Upgrade to Pro' : 'Manage subscription'}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <p className="mv-acct-label">Account</p>
          <div className="mv-acct-list">
            {basic ? null : (
              <MenuRow
                icon={<CreditCard className="h-4 w-4" />}
                tone="violet"
                label="Billing & invoices"
                detail="Payment method and receipts"
                onClick={() => void manage()}
              />
            )}
            <MenuRow
              icon={<Sparkles className="h-4 w-4" />}
              tone="blue"
              label="Plans & pricing"
              detail="Compare every plan"
              onClick={goPricing}
            />
            {adminSettings ? (
              <MenuRow
                icon={<Building2 className="h-4 w-4" />}
                tone="amber"
                label={adminSettings.label}
                onClick={() => navigate(adminSettings.path)}
              />
            ) : null}
          </div>

          <p className="mv-acct-label">Appearance</p>
          <div className="mv-acct-seg" role="radiogroup" aria-label="Theme">
            {THEMES.map((option) => {
              const selected = theme === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="mv-acct-seg-btn"
                  onClick={() => setTheme(option.id)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            role="menuitem"
            className="mv-acct-logout"
            onClick={() => {
              setOpen(false);
              logout();
              navigate('/login');
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
