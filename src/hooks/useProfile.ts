import { useState, useEffect, useCallback } from 'react';
import type { LearnerProfile } from '@/types';
import { loadProfile, saveProfile } from '@/lib/storage';

export function useProfile() {
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

  return { profile, loading, updateProfile };
}
