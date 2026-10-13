export interface PasswordRule {
  id: 'letter' | 'capital' | 'number' | 'length' | 'special';
  label: string;
  test: (password: string) => boolean;
}

/** Shared by signup and the API so an account cannot be created with a weaker password. */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'letter',
    label: 'At least one letter',
    test: (password) => /[A-Za-z]/.test(password),
  },
  {
    id: 'capital',
    label: 'At least one capital letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'number',
    label: 'At least one number',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'length',
    label: 'Be at least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    id: 'special',
    label: 'At least one special character',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function passwordMeetsPolicy(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
