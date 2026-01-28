/**
 * Airtime Commission Tiers for SSP currency
 * Based on total transaction volume:
 * - Up to 2M SSP: 1%
 * - 5M - 7.5M SSP: 2%
 * - 7.5M - 10M SSP: 3%
 * - Past 10M SSP: 5%
 */

export interface CommissionTier {
  minAmount: number;
  maxAmount: number | null;
  percentage: number;
  label: string;
}

export const AIRTIME_COMMISSION_TIERS_SSP: CommissionTier[] = [
  { minAmount: 0, maxAmount: 2_000_000, percentage: 1, label: 'Up to 2M SSP' },
  { minAmount: 2_000_001, maxAmount: 5_000_000, percentage: 1.5, label: '2M - 5M SSP' }, // Transition tier
  { minAmount: 5_000_000, maxAmount: 7_500_000, percentage: 2, label: '5M - 7.5M SSP' },
  { minAmount: 7_500_000, maxAmount: 10_000_000, percentage: 3, label: '7.5M - 10M SSP' },
  { minAmount: 10_000_000, maxAmount: null, percentage: 5, label: 'Above 10M SSP' },
];

/**
 * Calculate commission rate based on cumulative transaction volume
 * @param cumulativeVolume - Total transaction volume in SSP
 * @returns Commission percentage rate
 */
export function getAirtimeCommissionRate(cumulativeVolume: number): number {
  // Find the tier that matches the cumulative volume
  for (let i = AIRTIME_COMMISSION_TIERS_SSP.length - 1; i >= 0; i--) {
    const tier = AIRTIME_COMMISSION_TIERS_SSP[i];
    if (cumulativeVolume >= tier.minAmount) {
      return tier.percentage;
    }
  }
  return AIRTIME_COMMISSION_TIERS_SSP[0].percentage;
}

/**
 * Calculate commission amount for a transaction
 * @param amount - Transaction amount in SSP
 * @param cumulativeVolume - Agent's cumulative transaction volume in SSP
 * @returns Commission amount
 */
export function calculateAirtimeCommission(amount: number, cumulativeVolume: number): number {
  const rate = getAirtimeCommissionRate(cumulativeVolume);
  return (amount * rate) / 100;
}

/**
 * Get commission tier info for display
 * @param cumulativeVolume - Total transaction volume in SSP
 * @returns Tier information
 */
export function getCommissionTierInfo(cumulativeVolume: number): CommissionTier {
  for (let i = AIRTIME_COMMISSION_TIERS_SSP.length - 1; i >= 0; i--) {
    const tier = AIRTIME_COMMISSION_TIERS_SSP[i];
    if (cumulativeVolume >= tier.minAmount) {
      return tier;
    }
  }
  return AIRTIME_COMMISSION_TIERS_SSP[0];
}

/**
 * Get progress to next commission tier
 * @param cumulativeVolume - Total transaction volume in SSP
 * @returns Progress info or null if at max tier
 */
export function getNextTierProgress(cumulativeVolume: number): { 
  currentTier: CommissionTier; 
  nextTier: CommissionTier | null; 
  progress: number; 
  remaining: number;
} | null {
  const currentTierIndex = AIRTIME_COMMISSION_TIERS_SSP.findIndex(
    (tier, index) => {
      const nextTier = AIRTIME_COMMISSION_TIERS_SSP[index + 1];
      if (!nextTier) return cumulativeVolume >= tier.minAmount;
      return cumulativeVolume >= tier.minAmount && cumulativeVolume < nextTier.minAmount;
    }
  );
  
  if (currentTierIndex === -1) return null;
  
  const currentTier = AIRTIME_COMMISSION_TIERS_SSP[currentTierIndex];
  const nextTier = AIRTIME_COMMISSION_TIERS_SSP[currentTierIndex + 1] || null;
  
  if (!nextTier) {
    return { currentTier, nextTier: null, progress: 100, remaining: 0 };
  }
  
  const tierRange = nextTier.minAmount - currentTier.minAmount;
  const volumeInTier = cumulativeVolume - currentTier.minAmount;
  const progress = Math.min((volumeInTier / tierRange) * 100, 100);
  const remaining = nextTier.minAmount - cumulativeVolume;
  
  return { currentTier, nextTier, progress, remaining };
}
