import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building2,
  GraduationCap,
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

const ACCENT = '#06b6d4';

const SEGMENTS: {
  role: SignupRole;
  label: string;
  subtext: string;
  icon: typeof GraduationCap;
}[] = [
  {
    role: 'org_admin',
    label: 'School or Institution',
    subtext: 'Enterprise multi-tenant dashboard, teachers, classes, and school analytics.',
    icon: Building2,
  },
  {
    role: 'center_admin',
    label: 'Tutoring Center / Academy',
    subtext: 'Manage tutors, student batches, and batch performance reports.',
    icon: School,
  },
  {
    role: 'teacher',
    label: 'Independent Teacher / Tutor',
    subtext: 'Upload textbooks, enrich lessons, and manage AI student doubts.',
    icon: Presentation,
  },
  {
    role: 'parent',
    label: 'Parent',
    subtext: 'Link children, track progress, and manage study time.',
    icon: Users,
  },
  {
    role: 'student',
    label: 'Student',
    subtext: 'Interactive study workspace, AI tutor, videos, and quizzes.',
    icon: GraduationCap,
  },
];

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

  const preview =
    role === 'student' && dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? (() => {
          const dob = new Date(`${dateOfBirth}T12:00:00`);
          return { age: getAgeFromDOB(dob), group: getAgeGroupFromDOB(dob) };
        })()
      : null;

  const handleGoBack = () => {
    navigate(-1);
  };

  const chooseRole = (r: SignupRole) => {
    setRole(r);
    setStep(2);
    setError('');
    if (r === 'org_admin') setPlanType('school_enterprise');
    else if (r === 'center_admin') setPlanType('tutor_center_pro');
    else if (r === 'teacher') setPlanType('teacher_free');
    else if (r === 'parent') setPlanType('parent_free');
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
    <div className="relative min-h-screen">
      <button
        onClick={handleGoBack}
        type="button"
        className="absolute top-6 left-6 z-50 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-sm font-medium text-slate-300 shadow-lg backdrop-blur-md transition-all hover:border-cyan-500/50 hover:bg-slate-800 hover:text-white"
        aria-label="Go back to previous page"
      >
        <ArrowLeft className="h-4 w-4 text-cyan-400" />
        <span>Back</span>
      </button>

      <div className="page">
      <div className="page-header">
        <BrandLogo variant="full" to="/" imgClassName="mb-4 h-12 w-auto object-contain" />
        <h1 className="page-title">{t('auth.register')}</h1>
        <p className="page-subtitle">
          {step === 1 ? 'Who is signing up for MindVault?' : 'Create your account details.'}
        </p>
      </div>

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {SEGMENTS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.role}
                type="button"
                onClick={() => chooseRole(s.role)}
                className="card-cyber p-4 text-left hover:border-cyan-500/60"
              >
                <Icon className="mb-2 h-7 w-7" style={{ color: ACCENT }} />
                <p className="text-sm font-extrabold text-slate-100">{s.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.subtext}</p>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && role && (
        <form onSubmit={submit}>
          <button
            type="button"
            className="mb-4 text-sm font-semibold text-cyan-300"
            onClick={() => setStep(1)}
          >
            ← Change account type
          </button>
          <p className="mb-4 text-sm font-bold text-slate-400">
            Signing up as: {SEGMENTS.find((s) => s.role === role)?.label}
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="name">{t('auth.name')}</label>
            <input id="name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {(role === 'org_admin' || role === 'center_admin') && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="organizationName">
                  {role === 'org_admin' ? 'School name' : 'Center / academy name'}
                </label>
                <input
                  id="organizationName"
                  className="form-input"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="planType">Subscription plan</label>
                <select
                  id="planType"
                  className="form-input"
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
            </>
          )}

          {role === 'teacher' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="schoolName">School / center (optional)</label>
                <input
                  id="schoolName"
                  className="form-input"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="teacherPlan">Plan</label>
                <select
                  id="teacherPlan"
                  className="form-input"
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value as PlanType)}
                >
                  <option value="teacher_free">Teacher Free (1 PDF · 20 MB)</option>
                  <option value="teacher_pro">Teacher Pro (unlimited · 80 MB)</option>
                </select>
              </div>
            </>
          )}

          {role === 'student' && (
            <>
              <BirthDatePicker value={dateOfBirth} onChange={setDateOfBirth} required />
              {preview && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    fontSize: '0.875rem',
                    color: '#065f46',
                  }}
                >
                  Age <strong>{preview.age}</strong> · Unlocking{' '}
                  <strong>{AGE_GROUP_LABELS[preview.group]}</strong> curriculum
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="locale">Language / locale</label>
                <select
                  id="locale"
                  className="form-input"
                  value={locale}
                  onChange={(e) => setLocaleValue(e.target.value as Locale)}
                >
                  {LOCALES.map((l) => (
                    <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="classCode">Class invite code (optional)</label>
                <input
                  id="classCode"
                  className="form-input"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parentCode">Parent link code (optional)</label>
                <input
                  id="parentCode"
                  className="form-input"
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                  placeholder="6-character code from parent"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="studentPlan">Plan</label>
                <select
                  id="studentPlan"
                  className="form-input"
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value as PlanType)}
                >
                  <option value="student_free">Student Free</option>
                  <option value="student_pro">Student Pro</option>
                </select>
              </div>
            </>
          )}

          {role === 'parent' && (
            <div className="form-group">
              <label className="form-label" htmlFor="parentPlan">Plan</label>
              <select
                id="parentPlan"
                className="form-input"
                value={planType}
                onChange={(e) => setPlanType(e.target.value as PlanType)}
              >
                <option value="parent_free">Parent Free</option>
                <option value="family_plan">Family Plan</option>
              </select>
            </div>
          )}

          {error && <p style={{ color: '#dc2626', marginBottom: 16, fontSize: '0.9rem' }}>{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
          >
            {t('auth.register')}
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem' }}>
        {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
      </div>
    </div>
  );
}
