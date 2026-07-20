import { OnboardingGate } from '@/components/onboarding-gate';
import { Href, Redirect } from 'expo-router';
import * as React from 'react';

export default function AppIndex() {
  return (
    <OnboardingGate>
      <Redirect href={'/dashboard' as Href} />
    </OnboardingGate>
  );
}
