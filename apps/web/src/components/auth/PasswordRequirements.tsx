import { Check, X } from 'lucide-react';
import { PASSWORD_RULES } from '@brightpath/shared';

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <div
      id="password-requirements"
      className="z-20 mt-2 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xl"
    >
      <p className="text-sm font-semibold text-slate-700">Password must meet the following requirements:</p>
      <ul className="mt-2 space-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.id} className="flex items-center gap-2 text-sm font-medium">
              {met ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <X className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />
              )}
              <span className={met ? 'text-emerald-700' : 'text-rose-600'}>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
