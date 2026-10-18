import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isPlatformOwner } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const OPEN_PATHS = ['/pricing', '/login', '/register', '/billing', '/reset-password'];

function isOpenPath(pathname: string) {
  return OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`) || pathname.startsWith(path));
}

export function isServiceSuspended(status: string | null | undefined) {
  return status === 'past_due' || status === 'canceled' || status === 'inactive';
}

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { role, user, organization, logout, loading } = useAuth();
  const { pathname } = useLocation();
  const [status, setStatus] = useState<string | null>(
    organization?.subscriptionStatus ?? user?.subscriptionStatus ?? null,
  );
  const suspended = isServiceSuspended(status);
  // While locked, re-check on navigation so a completed payment unlocks without a reload.
  const recheckKey = suspended ? pathname : '';

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    api
      .paymentStatus()
      .then((res) => {
        if (!cancelled) setStatus(res.subscriptionStatus);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [role, recheckKey]);

  const owner = isPlatformOwner(role, user?.email);
  const blocked = Boolean(role) && !loading && !owner && suspended && !isOpenPath(pathname);
  if (!blocked) return children;

  const isAdmin = role === 'org_admin' || role === 'center_admin';
  const kind = organization?.type === 'tutor_center' || role === 'center_admin' ? 'academy' : 'school';
  const neverPaid = status === 'inactive';

  return (
    <div className="mv-suspend">
      <section className="mv-suspend-card">
        <p className="mv-plan-kicker">{neverPaid ? 'Subscription required' : 'Plan paused'}</p>
        <h1>{isAdmin || !organization ? 'Purchase a plan to continue' : `Your ${kind}'s plan is not active`}</h1>
        <p>
          {isAdmin && neverPaid
            ? `MindVault tools for your ${kind} unlock as soon as your subscription payment is complete. Your login is active, so choose a plan to get started.`
            : !isAdmin && organization
              ? `Your ${kind}'s MindVault subscription is not active yet, so tools are locked. Ask your ${kind} administrator to complete the payment.`
              : 'This account’s payment failed or the plan was not renewed, so MindVault tools are paused. Your login is still active.'}
        </p>
        {isAdmin || !organization ? (
          <Link to="/pricing" className="mv-upgrade-btn mv-suspend-action">
            {neverPaid ? 'Choose a plan' : 'Subscription'}
          </Link>
        ) : null}
        <button
          type="button"
          className="mv-settings-item"
          onClick={() => {
            logout();
            window.location.assign('/login');
          }}
        >
          Log out
        </button>
      </section>
    </div>
  );
}
