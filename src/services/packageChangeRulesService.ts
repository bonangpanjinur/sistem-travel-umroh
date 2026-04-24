import { supabase } from "@/integrations/supabase/client";
import { PackageChangeRule, PackageChangePenalty } from "@/types/packageChangeRules";
import { differenceInDays, parseISO } from "date-fns";

/**
 * Fetch all package change rules for a specific package
 */
export async function getPackageChangeRules(packageId: string): Promise<PackageChangeRule[]> {
  const { data, error } = await supabase
    .from("package_change_rules")
    .select("*")
    .eq("package_id", packageId)
    .order("min_days_before_departure", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as PackageChangeRule[];
}

/**
 * Fetch all package change rules (for admin management)
 */
export async function getAllPackageChangeRules(): Promise<PackageChangeRule[]> {
  const { data, error } = await supabase
    .from("package_change_rules")
    .select(`
      *,
      package:packages(id, name, code)
    `)
    .order("min_days_before_departure", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as PackageChangeRule[];
}

/**
 * Calculate penalty for package change based on departure date
 * Returns the applicable penalty rule or null if no penalty applies
 */
export async function calculatePackageChangePenalty(
  packageId: string,
  departureDateString: string
): Promise<PackageChangePenalty | null> {
  try {
    const rules = await getPackageChangeRules(packageId);
    
    if (!rules || rules.length === 0) {
      return {
        applicable: false,
        daysToDeparture: 0,
        penaltyAmount: 0,
        penaltyType: 'fixed',
        reason: 'No rules configured for this package'
      };
    }

    const departureDate = parseISO(departureDateString);
    const today = new Date();
    const daysToDeparture = differenceInDays(departureDate, today);

    // Find the applicable rule (highest min_days_before_departure that is still <= daysToDeparture)
    // Sort rules by min_days_before_departure in descending order
    const sortedRules = [...rules].sort(
      (a, b) => b.min_days_before_departure - a.min_days_before_departure
    );

    for (const rule of sortedRules) {
      if (daysToDeparture < rule.min_days_before_departure) {
        // This rule applies
        return {
          applicable: true,
          daysToDeparture,
          penaltyAmount: rule.penalty_amount,
          penaltyType: rule.penalty_type,
          reason: rule.description || `Pindah paket kurang dari H-${rule.min_days_before_departure}`
        };
      }
    }

    // No penalty applies
    return {
      applicable: false,
      daysToDeparture,
      penaltyAmount: 0,
      penaltyType: 'fixed',
      reason: 'Masih dalam periode bebas denda'
    };
  } catch (error) {
    console.error("Error calculating penalty:", error);
    throw error;
  }
}

/**
 * Create a new package change rule
 */
export async function createPackageChangeRule(
  packageId: string,
  minDaysBeforeDeparture: number,
  penaltyAmount: number,
  penaltyType: 'fixed' | 'percentage' = 'fixed',
  description?: string
): Promise<PackageChangeRule> {
  const { data, error } = await supabase
    .from("package_change_rules")
    .insert({
      package_id: packageId,
      min_days_before_departure: minDaysBeforeDeparture,
      penalty_amount: penaltyAmount,
      penalty_type: penaltyType,
      description
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PackageChangeRule;
}

/**
 * Update an existing package change rule
 */
export async function updatePackageChangeRule(
  ruleId: string,
  updates: Partial<Omit<PackageChangeRule, 'id' | 'created_at' | 'updated_at'>>
): Promise<PackageChangeRule> {
  const { data, error } = await supabase
    .from("package_change_rules")
    .update(updates)
    .eq("id", ruleId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PackageChangeRule;
}

/**
 * Delete a package change rule
 */
export async function deletePackageChangeRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from("package_change_rules")
    .delete()
    .eq("id", ruleId);

  if (error) throw error;
}

/**
 * Delete all rules for a package (useful when deleting a package)
 */
export async function deletePackageChangeRulesByPackageId(packageId: string): Promise<void> {
  const { error } = await supabase
    .from("package_change_rules")
    .delete()
    .eq("package_id", packageId);

  if (error) throw error;
}
