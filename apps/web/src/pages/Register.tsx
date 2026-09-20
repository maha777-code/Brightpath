import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  GraduationCap,
  Loader2,
  Presentation,
  School,
  Users,
} from 'lucide-react';
import {
  LOCALES,
  LOCALE_LABELS,
  getAgeFromDOB,
  getAgeGroupFromDOB,
  AGE_GROUP_LABELS,
  type Locale,
  type SignupRole,
  type PlanType,
} from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { BirthDatePicker } from '@/components/age/BirthDatePicker';
import { BrandLogo } from '@/components/Navigation/BrandLogo';

const SEGMENTS: {
  role: SignupRole;
  label: string;
  continueAs: string;
  subtext: string;
  icon: typeof GraduationCap;
  gradient: string;
  borderColor: string;
}[] = [
  {
    role: 'org_admin',
    label: 'School or Institution',
    continueAs: 'school',
    subtext: 'Enterprise multi-tenant dashboard, teachers, classes, and school analytics.',
    icon: Building2,
    gradient: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/40',
  },
  {
    role: 'center_admin',
    label: 'Tutoring Center / Academy',
    continueAs: 'academy',
    subtext: 'Manage tutors, student batches, and batch performance reports.',
    icon: School,
    gradient: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/40',
  },
  {
    role: 'teacher',
    label: 'Independent Teacher / Tutor',
    continueAs: 'teacher',
    subtext: 'Upload textbooks, enrich lessons, and manage AI student doubts.',
    icon: Presentation,
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-teal-500/40',
  },
  {
    role: 'parent',
    label: 'Parent',
    continueAs: 'parent',
    subtext: 'Link children, track progress, and manage study time.',
    icon: Users,
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/40',
  },
  {
    role: 'student',
    label: 'Student',
    continueAs: 'student',
    subtext: 'Interactive study workspace, AI tutor, videos, and quizzes.',
    icon: GraduationCap,
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/40',
  },
];

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-4 py-3.5 text-base text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400';

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<SignupRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [locale, setLocaleValue] = useState<Locale>('en-IN');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [planType, setPlanType] = useState<PlanType | ''>('');
  const [classCode, setClassCode] = useState('');
  const [parentCode, setParentCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedSegment = SEGMENTS.find((segment) => segment.role === role) ?? null;

  const preview =
    role === 'student' && dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? (() => {
          const dob = new Date(`${dateOfBirth}T12:00:00`);
          return { age: getAgeFromDOB(dob), group: getAgeGroupFromDOB(dob) };
        })()
      : null;

  const handleGoBack = () => {
    navigate('/');
  };

  const chooseRole = (nextRole: SignupRole) => {
    setRole(nextRole);
    setStep(2);
    setError('');
    if (nextRole === 'org_admin') setPlanType('school_enterprise');
    else if (nextRole === 'center_admin') setPlanType('tutor_center_pro');
    else if (nextRole === 'teacher') setPlanType('teacher_free');
    else if (nextRole === 'parent') setPlanType('parent_free');
    else setPlanType('student_free');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!role) {
      setError('Please select an account type.');
      return;
    }
    if (role === 'student' && !dateOfBirth) {
      setError('Date of birth is required to personalize the curriculum.');
      return;
    }
    if ((role === 'org_admin' || role === 'center_admin') && organizationName.trim().length < 2) {
      setError('Organization name is required.');
      return;
    }
    setBusy(true);
    try {
      const result = await register({
        email,
        password,
        name: name || undefined,
        locale,
        role,
        dateOfBirth: role === 'student' ? dateOfBirth : undefined,
        schoolName: role === 'teacher' ? schoolName || undefined : undefined,
        organizationName:
          role === 'org_admin' || role === 'center_admin' ? organizationName.trim() : undefined,
        orgType: role === 'org_admin' ? 'school' : role === 'center_admin' ? 'tutor_center' : undefined,
        planType: planType || undefined,
        classCode: role === 'student' && classCode ? classCode.trim() : undefined,
        parentCode: role === 'student' && parentCode ? parentCode.trim() : undefined,
      });
      navigate(result.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bp-register relative flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <button
        onClick={handleGoBack}
        type="button"
        className="bp-register-back absolute left-6 top-6 z-50 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-sm font-medium text-slate-300 shadow-lg backdrop-blur-md transition-all hover:border-cyan-500/50 hover:bg-slate-800 hover:text-white"
        aria-label="Go back to previous page"
      >
        <ArrowLeft className="h-4 w-4 text-cyan-400" />
        <span>Back</span>
      </button>

      <div className="bp-register-shell w-full max-w-[75vw] space-y-10">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />
          </div>
          <div className="space-y-2">
            <h1 className="bp-register-title text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Create Account
            </h1>
            <p className="bp-register-subtitle mx-auto max-w-3xl text-xl font-medium text-slate-400">
              {step === 1
                ? 'Who is signing up for MindVault? Choose your role to personalize your workspace.'
                : 'Create your account details.'}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="bp-register-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SEGMENTS.map((segment) => {
              const Icon = segment.icon;
              const isSelected = role === segment.role;
              return (
                <button
                  key={segment.role}
                  type="button"
                  onClick={() => chooseRole(segment.role)}
                  className={`bp-register-card group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-8 text-left transition-all duration-300 ${
                    isSelected
                      ? 'scale-[1.02] border-cyan-400 bg-slate-900 shadow-[0_0_35px_rgba(6,182,212,0.35)]'
                      : 'border-slate-800 bg-slate-900/60 hover:-translate-y-1 hover:border-cyan-500 hover:bg-slate-900/90 hover:shadow-[0_0_30px_rgba(6,182,212,0.25)]'
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${segment.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                  />
                  <div className="relative z-10 space-y-5">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${segment.borderColor} bg-slate-800/80 shadow-[0_0_20px_rgba(6,182,212,0.18)] transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-8 w-8 text-cyan-300" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white transition-colors group-hover:text-cyan-300">
                        {segment.label}
                      </h3>
                      <p className="text-base leading-relaxed text-slate-300">{segment.subtext}</p>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between pt-6 text-sm font-bold text-cyan-400 opacity-80 group-hover:opacity-100">
                    <span>Continue as {segment.continueAs}</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && role && selectedSegment && (
          <form
            onSubmit={(event) => void submit(event)}
            className="bp-register-form mx-auto w-full max-w-4xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl md:p-10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="text-sm font-semibold text-cyan-300 transition-colors hover:text-white"
                onClick={() => setStep(1)}
              >
                ← Change account type
              </button>
              <p className="text-sm font-bold text-slate-400">
                Signing up as: <span className="text-cyan-300">{selectedSegment.label}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-100" htmlFor="name">
                  {t('auth.name')}
                </label>
                <input
                  id="name"
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-100" htmlFor="email">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-100" htmlFor="password">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  className={fieldClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {(role === 'org_admin' || role === 'center_admin') && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-100" htmlFor="organizationName">
                    {role === 'org_admin' ? 'School name' : 'Center / academy name'}
                  </label>
                  <input
                    id="organizationName"
                    className={fieldClass}
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-100" htmlFor="planType">
                    Subscription plan
                  </label>
                  <select
                    id="planType"
                    className={fieldClass}
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as PlanType)}
                  >
                    {role === 'org_admin' ? (
                      <option value="school_enterprise">School Enterprise</option>
                    ) : (
                      <option value="tutor_center_pro">Tutor Center Pro</option>
                    )}
                  </select>
                </div>
              </div>
            )}

            {role === 'teacher' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-100" htmlFor="schoolName">
                    School / center (optional)
                  </label>
                  <input
                    id="schoolName"
                    className={fieldClass}
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-100" htmlFor="teacherPlan">
                    Plan
                  </label>
                  <select
                    id="teacherPlan"
                    className={fieldClass}
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as PlanType)}
                  >
                    <option value="teacher_free">Teacher Free (1 PDF · 20 MB)</option>
                    <option value="teacher_pro">Teacher Pro (unlimited · 80 MB)</option>
                  </select>
                </div>
              </div>
            )}

            {role === 'student' && (
              <>
                <BirthDatePicker value={dateOfBirth} onChange={setDateOfBirth} required />
                {preview && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100">
                    Age <strong>{preview.age}</strong> · Unlocking{' '}
                    <strong>{AGE_GROUP_LABELS[preview.group]}</strong> curriculum
                  </div>
                )}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-100" htmlFor="locale">
                      Language / locale
                    </label>
                    <select
                      id="locale"
                      className={fieldClass}
                      value={locale}
                      onChange={(e) => setLocaleValue(e.target.value as Locale)}
                    >
                      {LOCALES.map((l) => (
                        <option key={l} value={l}>
                          {LOCALE_LABELS[l]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-100" htmlFor="studentPlan">
                      Plan
                    </label>
                    <select
                      id="studentPlan"
                      className={fieldClass}
                      value={planType}
                      onChange={(e) => setPlanType(e.target.value as PlanType)}
                    >
                      <option value="student_free">Student Free</option>
                      <option value="student_pro">Student Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-100" htmlFor="classCode">
                      Class invite code (optional)
                    </label>
                    <input
                      id="classCode"
                      className={fieldClass}
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                      placeholder="e.g. AB12CD"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-100" htmlFor="parentCode">
                      Parent link code (optional)
                    </label>
                    <input
                      id="parentCode"
                      className={fieldClass}
                      value={parentCode}
                      onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                      placeholder="6-character code from parent"
                    />
                  </div>
                </div>
              </>
            )}

            {role === 'parent' && (
              <div>
                <label className="block text-sm font-semibold text-slate-100" htmlFor="parentPlan">
                  Plan
                </label>
                <select
                  id="parentPlan"
                  className={fieldClass}
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value as PlanType)}
                >
                  <option value="parent_free">Parent Free</option>
                  <option value="family_plan">Family Plan</option>
                </select>
              </div>
            )}

            {error ? (
              <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/10 py-3.5 text-base font-semibold text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {t('auth.register')}
            </button>
          </form>
        )}

        <div className="pt-6 text-center">
          <p className="text-lg font-medium text-slate-200">
            {t('auth.hasAccount')}{' '}
            <Link
              to="/login"
              className="bp-register-login font-bold text-cyan-400 underline underline-offset-4 transition-colors hover:text-cyan-300 visited:text-cyan-400"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
