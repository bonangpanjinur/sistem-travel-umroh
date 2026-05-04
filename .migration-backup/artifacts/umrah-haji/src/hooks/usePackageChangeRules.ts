import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPackageChangeRules,
  getAllPackageChangeRules,
  calculatePackageChangePenalty,
  createPackageChangeRule,
  updatePackageChangeRule,
  deletePackageChangeRule,
} from "@/services/packageChangeRulesService";
import { PackageChangeRule, PackageChangePenalty } from "@/types/packageChangeRules";

/**
 * Hook to fetch package change rules for a specific package
 */
export function usePackageChangeRules(packageId: string) {
  return useQuery({
    queryKey: ["package-change-rules", packageId],
    queryFn: () => getPackageChangeRules(packageId),
    enabled: !!packageId,
  });
}

/**
 * Hook to fetch all package change rules (admin)
 */
export function useAllPackageChangeRules() {
  return useQuery({
    queryKey: ["all-package-change-rules"],
    queryFn: getAllPackageChangeRules,
  });
}

/**
 * Hook to calculate penalty for a specific booking
 */
export function useCalculatePackageChangePenalty(
  packageId: string,
  departureDateString: string
) {
  return useQuery({
    queryKey: ["package-change-penalty", packageId, departureDateString],
    queryFn: () => calculatePackageChangePenalty(packageId, departureDateString),
    enabled: !!packageId && !!departureDateString,
  });
}

/**
 * Hook to create a new package change rule
 */
export function useCreatePackageChangeRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      packageId,
      minDaysBeforeDeparture,
      penaltyAmount,
      penaltyType = 'fixed',
      description,
    }: {
      packageId: string;
      minDaysBeforeDeparture: number;
      penaltyAmount: number;
      penaltyType?: 'fixed' | 'percentage';
      description?: string;
    }) =>
      createPackageChangeRule(
        packageId,
        minDaysBeforeDeparture,
        penaltyAmount,
        penaltyType,
        description
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["package-change-rules", data.package_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["all-package-change-rules"],
      });
    },
  });
}

/**
 * Hook to update a package change rule
 */
export function useUpdatePackageChangeRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      updates,
    }: {
      ruleId: string;
      updates: Partial<Omit<PackageChangeRule, 'id' | 'created_at' | 'updated_at'>>;
    }) => updatePackageChangeRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-package-change-rules"],
      });
      // Invalidate all specific package rules queries
      queryClient.invalidateQueries({
        queryKey: ["package-change-rules"],
      });
    },
  });
}

/**
 * Hook to delete a package change rule
 */
export function useDeletePackageChangeRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => deletePackageChangeRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-package-change-rules"],
      });
      queryClient.invalidateQueries({
        queryKey: ["package-change-rules"],
      });
    },
  });
}
