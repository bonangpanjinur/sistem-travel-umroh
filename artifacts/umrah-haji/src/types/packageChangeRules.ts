export interface PackageChangeRule {
  id: string;
  package_id: string;
  min_days_before_departure: number; // H-X format
  penalty_amount: number;
  penalty_type: 'fixed' | 'percentage';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PackageChangeRuleWithPackage extends PackageChangeRule {
  package?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface PackageChangePenalty {
  applicable: boolean;
  daysToDeparture: number;
  penaltyAmount: number;
  penaltyType: 'fixed' | 'percentage';
  reason?: string;
}
