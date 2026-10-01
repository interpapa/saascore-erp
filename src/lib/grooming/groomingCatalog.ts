/**
 * Rendo ERP / SaaSCore - Catálogo Maestro de Peluquería Canina & Pet Grooming
 * 
 * Servicios veterinarios de estética, matriz de precios por tamaño de raza,
 * tipos de manto, desanudado, higiene integral y baño medicado.
 */

export type PetSize = 'toy' | 'small' | 'medium' | 'large' | 'giant';
export type PetCoat = 'short' | 'long' | 'curly' | 'double_coat' | 'wire';
export type PetTemperament = 'docile' | 'nervous' | 'reactive_bites' | 'senior';

export interface PetSizeConfig {
  size: PetSize;
  label: string;
  weightRange: string;
  exampleBreeds: string;
  baseBathPriceUSD: number;
  baseFullGroomPriceUSD: number;
}

export const PET_SIZES_CONFIG: Record<PetSize, PetSizeConfig> = {
  toy: {
    size: 'toy',
    label: 'Mini / Toy',
    weightRange: '< 5 kg',
    exampleBreeds: 'Chihuahua, Pomerania mini, Pinscher, Yorkshire mini',
    baseBathPriceUSD: 12.0,
    baseFullGroomPriceUSD: 20.0
  },
  small: {
    size: 'small',
    label: 'Pequeño',
    weightRange: '5 - 10 kg',
    exampleBreeds: 'Poodle Toy, Shih Tzu, Pug, Schnauzer Mini, Maltés',
    baseBathPriceUSD: 15.0,
    baseFullGroomPriceUSD: 25.0
  },
  medium: {
    size: 'medium',
    label: 'Mediano',
    weightRange: '10 - 25 kg',
    exampleBreeds: 'Cocker Spaniel, Bulldog Francés, Beagle, Schnauzer Estándar',
    baseBathPriceUSD: 20.0,
    baseFullGroomPriceUSD: 35.0
  },
  large: {
    size: 'large',
    label: 'Grande',
    weightRange: '25 - 40 kg',
    exampleBreeds: 'Golden Retriever, Labrador, Pastor Alemán, Boxer',
    baseBathPriceUSD: 28.0,
    baseFullGroomPriceUSD: 45.0
  },
  giant: {
    size: 'giant',
    label: 'Gigante',
    weightRange: '> 40 kg',
    exampleBreeds: 'San Bernardo, Gran Danés, Boyero de Berna, Terranova',
    baseBathPriceUSD: 38.0,
    baseFullGroomPriceUSD: 60.0
  }
};

export interface GroomingServiceDefinition {
  id: string;
  code: string;
  name: string;
  category: 'bano' | 'corte' | 'spa_higiene' | 'suplemento' | 'retail';
  categoryLabel: string;
  defaultPriceUSD: number;
  durationMin: number;
  description: string;
  color: string;
}

export const GROOMING_SERVICES_MASTER: GroomingServiceDefinition[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. BAÑOS ESPECIALIZADOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'groom-bath-01',
    code: 'BATH-01',
    name: 'Baño Tradicional & Mascarilla Hidratante',
    category: 'bano',
    categoryLabel: 'Baños',
    defaultPriceUSD: 15.0,
    durationMin: 40,
    description: 'Champú nutritivo hipoalergénico, acondicionador desenredante y secado con turbina.',
    color: '#06b6d4'
  },
  {
    id: 'groom-bath-02',
    code: 'BATH-02',
    name: 'Baño Medicado Antipulgas & Garrapatas (Ectoparasiticida)',
    category: 'bano',
    categoryLabel: 'Baños',
    defaultPriceUSD: 20.0,
    durationMin: 45,
    description: 'Tratamiento activo con champú antiparasitario para eliminación inmediata de pulgas y garrapatas.',
    color: '#0891b2'
  },
  {
    id: 'groom-bath-03',
    code: 'BATH-03',
    name: 'Baño Iluminador para Mantos Blancos (Anti-Amarillamiento)',
    category: 'bano',
    categoryLabel: 'Baños',
    defaultPriceUSD: 18.0,
    durationMin: 40,
    description: 'Fórmula óptica con pigmentos violetas para intensificar el color blanco de Caniches, Malteses y Westies.',
    color: '#38bdf8'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. CORTES & ESTILISMO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'groom-cut-01',
    code: 'CUT-01',
    name: 'Corte de Raza Estándar (Schnauzer, Cocker, Poodle)',
    category: 'corte',
    categoryLabel: 'Cortes & Estilismo',
    defaultPriceUSD: 20.0,
    durationMin: 50,
    description: 'Líneas oficiales de la raza con tijera recta, curva y esculpidora para acabado profesional.',
    color: '#10b981'
  },
  {
    id: 'groom-cut-02',
    code: 'CUT-02',
    name: 'Corte Cachorro / Asian Fusion (Teddy Bear)',
    category: 'corte',
    categoryLabel: 'Cortes & Estilismo',
    defaultPriceUSD: 22.0,
    durationMin: 55,
    description: 'Acabado redondeado estilo peluche en cabeza, hocico redondeado y patas acampanadas.',
    color: '#059669'
  },
  {
    id: 'groom-cut-03',
    code: 'CUT-03',
    name: 'Rapado Sanitario & Higiénico (Almohadillas & Zona Perianal)',
    category: 'corte',
    categoryLabel: 'Cortes & Estilismo',
    defaultPriceUSD: 8.0,
    durationMin: 15,
    description: 'Despeje con máquina #10 y #30 en pulpejos plantares y zona íntima para evitar acumulación de suciedad.',
    color: '#14b8a6'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. SPA & HIGIENE INTEGRAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'groom-spa-01',
    code: 'SPA-01',
    name: 'Corte & Limado de Uñas con Pulidor Rotatorio',
    category: 'spa_higiene',
    categoryLabel: 'Higiene & Spa',
    defaultPriceUSD: 6.0,
    durationMin: 15,
    description: 'Corte de seguridad sin tocar la vena rápida y limado suave para evitar arañazos a los tutores.',
    color: '#8b5cf6'
  },
  {
    id: 'groom-spa-02',
    code: 'SPA-02',
    name: 'Limpieza Ótica Profunda & Depilación del Canal Auditivo',
    category: 'spa_higiene',
    categoryLabel: 'Higiene & Spa',
    defaultPriceUSD: 6.0,
    durationMin: 15,
    description: 'Remoción de pelos internos y limpieza con solución antiséptica secante para prevenir otitis.',
    color: '#7c3aed'
  },
  {
    id: 'groom-spa-03',
    code: 'SPA-03',
    name: 'Vaciado de Glándulas Perianales en Bañera',
    category: 'spa_higiene',
    categoryLabel: 'Higiene & Spa',
    defaultPriceUSD: 5.0,
    durationMin: 10,
    description: 'Drenaje preventivo de sacos anales para evitar impactaciones, infecciones o mal olor.',
    color: '#6d28d9'
  },
  {
    id: 'groom-spa-04',
    code: 'SPA-04',
    name: 'Cepillado Dental Enzimático con Dedal Canino',
    category: 'spa_higiene',
    categoryLabel: 'Higiene & Spa',
    defaultPriceUSD: 5.0,
    durationMin: 10,
    description: 'Pasta con sabor a carne y enzimas anti-sarro con spray refrescante de clorofila.',
    color: '#a855f7'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. SUPLEMENTOS POR CONDICIÓN DE ENTRADA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'groom-sup-01',
    code: 'SUP-01',
    name: 'Desanudado Intensivo / Manto Apelmazado',
    category: 'suplemento',
    categoryLabel: 'Suplementos',
    defaultPriceUSD: 10.0,
    durationMin: 30,
    description: 'Apertura de nudos con spray desenredante bifásico y cortanudos manual antes del baño.',
    color: '#e11d48'
  },
  {
    id: 'groom-sup-02',
    code: 'SUP-02',
    name: 'Deslanado Profundo de Subpelo (Doble Manto)',
    category: 'suplemento',
    categoryLabel: 'Suplementos',
    defaultPriceUSD: 12.0,
    durationMin: 35,
    description: 'Extracción de subpelo muerto en perros de muda continua (Husky, Pastor, Pomerania) con rastrillo deslanador.',
    color: '#f43f5e'
  },
  {
    id: 'groom-sup-03',
    code: 'SUP-03',
    name: 'Manejo Especial por Temperamento Reactivo',
    category: 'suplemento',
    categoryLabel: 'Suplementos',
    defaultPriceUSD: 8.0,
    durationMin: 20,
    description: 'Atención doble estilista para mascotas agresivas o con miedo extremo.',
    color: '#be123c'
  }
];

/**
 * Combina el catálogo de pet grooming con los servicios del tenant
 */
export function mergeTenantGroomingServices(
  tenantItems: Array<{ id: string; name: string; base_price?: number; type?: string; metadata?: any }>
): GroomingServiceDefinition[] {
  const customList: GroomingServiceDefinition[] = [];

  for (const item of tenantItems || []) {
    if (item.type === 'service' || item.type === 'product') {
      const match = GROOMING_SERVICES_MASTER.find(
        g => g.name.toLowerCase() === item.name.toLowerCase()
      );

      if (match) {
        customList.push({
          ...match,
          id: item.id,
          defaultPriceUSD: Number(item.base_price || match.defaultPriceUSD),
        });
      } else if (item.metadata?.vertical === 'grooming' || item.metadata?.category?.includes('grooming') || item.metadata?.category?.includes('mascota')) {
        customList.push({
          id: item.id,
          code: `GROOM-${item.id.slice(0, 4).toUpperCase()}`,
          name: item.name,
          category: item.type === 'product' ? 'retail' : 'corte',
          categoryLabel: item.type === 'product' ? 'Pet Shop' : 'Servicio Especial',
          defaultPriceUSD: Number(item.base_price || 15),
          durationMin: Number(item.metadata?.durationMin || 30),
          description: item.name,
          color: '#10b981'
        });
      }
    }
  }

  for (const master of GROOMING_SERVICES_MASTER) {
    if (!customList.some(c => c.name.toLowerCase() === master.name.toLowerCase())) {
      customList.push(master);
    }
  }

  return customList;
}
