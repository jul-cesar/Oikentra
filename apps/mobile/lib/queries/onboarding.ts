import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBusiness,
  getBusiness,
  getBusinesses,
  getProfile,
  patchProfile,
  saveProfile,
  updateBusiness,
  type Business,
  type Profile,
} from '@/lib/onboarding-api';

export const queryKeys = {
  profile: ['profile'] as const,
  businesses: ['businesses'] as const,
  business: (id: string) => ['business', id] as const,
};

export function useProfile() {
  return useQuery<Profile, Error>({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
  });
}

export function useBusinesses(options: { enabled?: boolean } = {}) {
  return useQuery<Business[], Error>({
    queryKey: queryKeys.businesses,
    queryFn: getBusinesses,
    enabled: options.enabled,
  });
}

export function useBusiness(id: string) {
  return useQuery<Business, Error>({
    queryKey: queryKeys.business(id),
    queryFn: () => getBusiness(id),
    enabled: Boolean(id),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation<Business, Error, { name: string }>({
    mutationFn: createBusiness,
    onSuccess: (business) => {
      queryClient.setQueryData(queryKeys.business(business.id), business);
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses });
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation<Business, Error, { id: string; input: Parameters<typeof updateBusiness>[1] }>({
    mutationFn: ({ id, input }) => updateBusiness(id, input),
    onSuccess: (business) => {
      queryClient.setQueryData(queryKeys.business(business.id), business);
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses });
    },
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation<Profile, Error, Parameters<typeof saveProfile>[0]>({
    mutationFn: saveProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
    },
  });
}

export function usePatchProfile() {
  const queryClient = useQueryClient();

  return useMutation<Profile, Error, Parameters<typeof patchProfile>[0]>({
    mutationFn: patchProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
    },
  });
}
