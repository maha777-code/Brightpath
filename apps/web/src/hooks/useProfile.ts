import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  createElement,
  type ReactNode,
} from 'react';
import type { LearnerProfile } from '@/types';
import { loadProfile, saveProfile } from '@/lib/storage';

interface ProfileContextValue {
  profile: LearnerProfile | null;
  loading: boolean;
  updateProfile: (next: LearnerProfile) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProfile(loadProfile());
    setLoading(false);
  }, []);

  const updateProfile = useCallback((next: LearnerProfile) => {
    saveProfile(next);
    setProfile(next);
  }, []);

  return createElement(
    ProfileContext.Provider,
    { value: { profile, loading, updateProfile } },
    children,
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return ctx;
}
