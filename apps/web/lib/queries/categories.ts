import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deactivateCategory,
  getCategories,
  updateCategory,
} from "@/lib/categories-api";

export const categoryQueryKeys = {
  categories: (businessId: string) =>
    ["cash-movement-categories", businessId] as const,
};

export function useCategories(businessId: string) {
  return useQuery({
    queryKey: categoryQueryKeys.categories(businessId),
    queryFn: () => getCategories(businessId),
    enabled: Boolean(businessId),
  });
}

export function useCreateCategory(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) =>
      createCategory(businessId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.categories(businessId),
      });
    },
  });
}

export function useUpdateCategory(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      name,
    }: {
      categoryId: string;
      name: string;
    }) => updateCategory(businessId, categoryId, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.categories(businessId),
      });
    },
  });
}

export function useDeactivateCategory(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      deactivateCategory(businessId, categoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.categories(businessId),
      });
    },
  });
}
