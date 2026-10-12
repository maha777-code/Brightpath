import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const OPEN_PATHS = ['/pricing', '/login', '/register', '/billing'];

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
  }, [role]);

  const blocked = Boolean(role) && !loading && isServiceSuspended(status) && !isOpenPath(pathname);
  if (!blocked) return children;

  return (
    <div className="mv-suspend">
      <section className="mv-suspend-card">
        <p className="mv-plan-kicker">Plan paused</p>
        <h1>Purchase a plan to continue</h1>
        <p>
          This account’s payment failed or the plan was not renewed, so MindVault tools are paused. Your login is
          still active.
        </p>
        <Link to="/pricing" className="mv-upgrade-btn mv-suspend-action">
          Subscription
        </Link>
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
