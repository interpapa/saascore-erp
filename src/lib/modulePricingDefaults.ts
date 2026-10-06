/**
 * Tipos y valores por defecto de precios por módulo.
 * Vive fuera de '@/app/actions/modulePricing' porque un archivo 'use server'
 * solo puede exportar funciones async.
 */

export interface BarberPricingConfig {
  defaultCommissionPercent: number;
  defaultDurationMin: number;
  tipSplitWithShop: boolean;
}

export interface GroomingPricingConfig {
  sizeBasePrices: {
    toy: number;
    small: number;
    medium: number;
    large: number;
    giant: number;
  };
  supplementPrices: {
    matting: number;
    tickFlea: number;
    nails: number;
    ears: number;
    teeth: number;
    reactiveFee: number;
  };
  defaultCommissionPercent: number;
}

export interface DentalPricingConfig {
  orthoMonthlyFeeUSD: number;
  bracketReplacementFeeUSD: number;
  endoCanalBaseUSD: number;
  perioCleaningBaseUSD: number;
  defaultDoctorCommissionPercent: number;
}

export const DEFAULT_CONFIGS: {
  barberia: BarberPricingConfig;
  grooming: GroomingPricingConfig;
  odontologia: DentalPricingConfig;
} = {
  barberia: {
    defaultCommissionPercent: 50,
    defaultDurationMin: 30,
    tipSplitWithShop: false,
  },
  grooming: {
    sizeBasePrices: {
      toy: 18,
      small: 22,
      medium: 28,
      large: 38,
      giant: 50,
    },
    supplementPrices: {
      matting: 10,
      tickFlea: 10,
      nails: 5,
      ears: 5,
      teeth: 6,
      reactiveFee: 8,
    },
    defaultCommissionPercent: 45,
  },
  odontologia: {
    orthoMonthlyFeeUSD: 35,
    bracketReplacementFeeUSD: 10,
    endoCanalBaseUSD: 40,
    perioCleaningBaseUSD: 30,
    defaultDoctorCommissionPercent: 50,
  },
};

export const DEFAULT_BARBER_PRICING: BarberPricingConfig = DEFAULT_CONFIGS.barberia;
export const DEFAULT_GROOMING_PRICING: GroomingPricingConfig = DEFAULT_CONFIGS.grooming;
export const DEFAULT_DENTAL_PRICING: DentalPricingConfig = DEFAULT_CONFIGS.odontologia;
