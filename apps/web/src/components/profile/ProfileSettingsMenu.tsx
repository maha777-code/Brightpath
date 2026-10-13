import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CreditCard, Settings, SunMedium, UserRound } from 'lucide-react';
import { useColorTheme, type ColorTheme } from '@/context/ColorTheme';
import { useAuth } from '@/context/AuthContext';
import { useDisplayUser } from '@/lib/displayUser';
import { api } from '@/lib/api';
import { PRICING_PLANS } from '@/pages/pricingData';

const THEMES: { id: ColorTheme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
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

function isBasicPlan(plan: string | null | undefined) {
  return !plan || BASIC_PLANS.has(plan);
}

function planCopy(planType: string | null | undefined, interval: string | null | undefined) {
  const catalogId = PLAN_CATALOG[planType ?? ''] ?? '';
  const plan = PRICING_PLANS.find((item) => item.id === catalogId);
  const yearly = interval === 'yearly' || interval === 'annual';
  const amount = plan ? (yearly ? plan.priceUSD.annualMonthly : plan.priceUSD.monthly) : 0;
  const price = typeof amount === 'string' ? amount : amount === 0 ? '$0/mo' : `$${amount}/mo`;
  return {
    title: plan?.title ?? 'Current plan',
    price,
  };
}

function resetCopy(iso: string | null | undefined) {
  if (!iso) return 'Renewal date appears after the first successful payment.';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Renewal date appears after the first successful payment.';
  const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Resets on ${formatted} (${days} day${days === 1 ? '' : 's'})`;
}

export function ProfileSettingsMenu({ expand = 'up' }: { expand?: 'up' | 'down' }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useColorTheme();
  const { user, teacher, parent, organization, role, planType } = useAuth();
  const { userName, schoolName } = useDisplayUser();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<'plan' | 'profile' | 'appearance' | null>(null);
  const [billing, setBilling] = useState<{ interval: string | null; nextBillingDate: string | null; planType: string | null } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const activePlan = billing?.planType ?? organization?.planType ?? planType ?? user?.planType ?? null;
  const showUpgrade = isBasicPlan(activePlan);

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
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSection(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setSection(null);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goPricing = () => navigate('/pricing');
  const copy = planCopy(activePlan, billing?.interval);
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';
  const email = user?.email || teacher?.email || parent?.email || '—';
  const subject = teacher?.subjectFocus?.trim();

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
      {showUpgrade ? (
        <button type="button" className="mv-upgrade-btn" onClick={goPricing}>
          Upgrade to Pro
        </button>
      ) : null}
      <button
        type="button"
        className="mv-settings-btn"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setOpen((value) => !value);
          setSection(null);
        }}
      >
        <Settings className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">Settings</span>
      </button>

      {open ? (
        <div id={menuId} className="mv-settings-panel" role="menu">
          <div className="mv-settings-row">
            <button type="button" className="mv-settings-item" aria-expanded={section === 'plan'} onClick={() => setSection((value) => (value === 'plan' ? null : 'plan'))}>
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">Plan & Usage</span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
            </button>
            {section === 'plan' ? (
              <div className="mv-settings-flyout">
                <div className="mv-plan-card">
                  <p className="mv-plan-kicker">Current plan</p>
                  <p className="mv-plan-title">
                    {copy.title} <span>{copy.price}</span>
                  </p>
                  <p className="mv-plan-meta">
                    {isBasicPlan(activePlan) ? 'No renewal charge on this plan.' : resetCopy(billing?.nextBillingDate)}
                  </p>
                  <button type="button" className="mv-settings-item" onClick={() => void manage()}>
                    Manage
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mv-settings-row">
            <button type="button" className="mv-settings-item" aria-expanded={section === 'profile'} onClick={() => setSection((value) => (value === 'profile' ? null : 'profile'))}>
              <UserRound className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">User profile</span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
            </button>
            {section === 'profile' ? (
              <div className="mv-settings-flyout">
                <dl className="mv-profile-card">
                  <div><dt>Name</dt><dd>{userName}</dd></div>
                  <div><dt>Email</dt><dd>{email}</dd></div>
                  <div><dt>Role</dt><dd>{ROLE_LABEL[role ?? ''] ?? role ?? '—'}</dd></div>
                  <div><dt>School</dt><dd>{organization?.name || schoolName || '—'}</dd></div>
                  {subject ? <div><dt>Subject</dt><dd>{subject}</dd></div> : null}
                  <div><dt>Plan</dt><dd>{copy.title}</dd></div>
                  <div><dt>Member since</dt><dd>{memberSince}</dd></div>
                </dl>
              </div>
            ) : null}
          </div>

          <div className="mv-settings-row">
            <button type="button" className="mv-settings-item" aria-expanded={section === 'appearance'} onClick={() => setSection((value) => (value === 'appearance' ? null : 'appearance'))}>
              <SunMedium className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">Theme</span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
            </button>
            {section === 'appearance' ? (
              <div className="mv-settings-flyout" role="group" aria-label="Theme">
                {THEMES.map((option) => {
                  const selected = theme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className="mv-settings-item mv-settings-choice"
                      aria-checked={selected}
                      role="menuitemradio"
                      onClick={() => setTheme(option.id)}
                    >
                      <span className="min-w-0 flex-1">{option.label}</span>
                      {selected ? <span aria-hidden="true">●</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button type="button" className="mv-settings-item" onClick={goPricing}>
            <CreditCard className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">View subscription</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
