/**
 * Rendo ERP / SaaSCore - Catálogo Maestro de Barbería & Men's Grooming
 * 
 * Servicios de corte masculino, rituales tradicionales de toalla caliente,
 * tratamientos faciales, colorimetría y productos de styling en silla.
 */

export interface BarberServiceDefinition {
  id: string;
  code: string;
  name: string;
  category: 'corte' | 'barba' | 'facial_spa' | 'color' | 'producto';
  categoryLabel: string;
  defaultPriceUSD: number;
  durationMin: number;
  description: string;
  color: string;
}

export const BARBER_SERVICES_MASTER: BarberServiceDefinition[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. CORTES DE CABELLO MASCULINO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'barb-corte-01',
    code: 'FADE-01',
    name: 'Corte Degradado / Skin Fade (Afeitadora Shaver)',
    category: 'corte',
    categoryLabel: 'Cortes Fade',
    defaultPriceUSD: 15.0,
    durationMin: 35,
    description: 'Degradado a cero o navaja (Low, Mid o High Fade), lavado refrescante y peinado con secador.',
    color: '#d97706'
  },
  {
    id: 'barb-corte-02',
    code: 'FADE-02',
    name: 'Corte Clásico a Tijera / Ejecutivo',
    category: 'corte',
    categoryLabel: 'Cortes Clásicos',
    defaultPriceUSD: 12.0,
    durationMin: 30,
    description: 'Técnica de tijera sobre peine, perfilado de patillas y contorno de cuello con navaja.',
    color: '#b45309'
  },
  {
    id: 'barb-corte-03',
    code: 'FADE-03',
    name: 'Taper Fade & Desvanecido de Patillas',
    category: 'corte',
    categoryLabel: 'Cortes Fade',
    defaultPriceUSD: 12.0,
    durationMin: 25,
    description: 'Desvanecido limpio en sienes y nuca baja manteniendo el volumen en contornos.',
    color: '#d97706'
  },
  {
    id: 'barb-corte-04',
    code: 'FADE-04',
    name: 'Corte Infantil / Niño con Diseño Básico',
    category: 'corte',
    categoryLabel: 'Cortes Especiales',
    defaultPriceUSD: 10.0,
    durationMin: 25,
    description: 'Atención paciente para niños, corte moderno y línea sencilla de cortesía.',
    color: '#0284c7'
  },
  {
    id: 'barb-corte-05',
    code: 'FADE-05',
    name: 'Diseño Freestyle / Grecas Artísticas',
    category: 'corte',
    categoryLabel: 'Cortes Especiales',
    defaultPriceUSD: 8.0,
    durationMin: 20,
    description: 'Líneas personalizadas o figuras geométricas detalladas a navaja de afeitar.',
    color: '#8b5cf6'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. RITUAL DE BARBA TRADICIONAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'barb-barba-01',
    code: 'BEARD-01',
    name: 'Ritual de Barba con Toalla Caliente & Vapor de Ozono',
    category: 'barba',
    categoryLabel: 'Ritual de Barba',
    defaultPriceUSD: 12.0,
    durationMin: 30,
    description: 'Vaporizador, toalla caliente aromatizada con eucalipto, recorte de longitud, perfilado con navaja y toalla fría astringente con bálsamo.',
    color: '#059669'
  },
  {
    id: 'barb-barba-02',
    code: 'BEARD-02',
    name: 'Afeitado Clásico de Cabeza Completa a Navaja',
    category: 'barba',
    categoryLabel: 'Ritual de Barba',
    defaultPriceUSD: 14.0,
    durationMin: 30,
    description: 'Afeitado tradicional con espuma caliente, doble pasada a navaja y tratamiento calmante anti-irritación.',
    color: '#10b981'
  },
  {
    id: 'barb-barba-03',
    code: 'BEARD-03',
    name: 'Pigmentación / Tinte Negro de Barba (Black Tint)',
    category: 'barba',
    categoryLabel: 'Ritual de Barba',
    defaultPriceUSD: 10.0,
    durationMin: 20,
    description: 'Cobertura de canas o definición de bordes con tinte semipermanente especial para barba.',
    color: '#047857'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. FACIAL, SPA & TRATAMIENTOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'barb-spa-01',
    code: 'SPA-01',
    name: 'Mascarilla Negra de Carbón Activado (Black Mask)',
    category: 'facial_spa',
    categoryLabel: 'Facial & Spa',
    defaultPriceUSD: 8.0,
    durationMin: 20,
    description: 'Limpieza profunda de puntos negros en zona T, exfoliación y aplicación de tónico descongestivo.',
    color: '#334155'
  },
  {
    id: 'barb-spa-02',
    code: 'SPA-02',
    name: 'Perfilado de Cejas con Navaja / Cera',
    category: 'facial_spa',
    categoryLabel: 'Facial & Spa',
    defaultPriceUSD: 5.0,
    durationMin: 10,
    description: 'Limpieza del entrecejo y definición de arco natural masculino.',
    color: '#64748b'
  },
  {
    id: 'barb-spa-03',
    code: 'SPA-03',
    name: 'Lavado Capilar con Champú Mentolado & Masaje Craneal',
    category: 'facial_spa',
    categoryLabel: 'Facial & Spa',
    defaultPriceUSD: 6.0,
    durationMin: 15,
    description: 'Exfoliación capilar anti-caspa, masaje relajante y tónico estimulante con mentol.',
    color: '#0891b2'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. COLORIMETRÍA MASCULINA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'barb-col-01',
    code: 'COL-01',
    name: 'Platinado Global / Decoloración Extrema',
    category: 'color',
    categoryLabel: 'Colorimetría',
    defaultPriceUSD: 40.0,
    durationMin: 90,
    description: 'Decoloración hasta altura 9-10 con protector plex y matización platinada / gris perla.',
    color: '#e11d48'
  },
  {
    id: 'barb-col-02',
    code: 'COL-02',
    name: 'Mechas / Reflejos con Gorro',
    category: 'color',
    categoryLabel: 'Colorimetría',
    defaultPriceUSD: 25.0,
    durationMin: 60,
    description: 'Iluminación en zona superior y matización personalizada.',
    color: '#f43f5e'
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. RETAIL & PRODUCTOS EN SILLA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'barb-prod-01',
    code: 'PROD-01',
    name: 'Pomada Fijación Media Base Agua (100g)',
    category: 'producto',
    categoryLabel: 'Venta en Silla',
    defaultPriceUSD: 14.0,
    durationMin: 0,
    description: 'Acabado con brillo natural, fácil de remover solo con agua.',
    color: '#475569'
  },
  {
    id: 'barb-prod-02',
    code: 'PROD-02',
    name: 'Polvo de Volumen Texturizante (Matt Powder)',
    category: 'producto',
    categoryLabel: 'Venta en Silla',
    defaultPriceUSD: 12.0,
    durationMin: 0,
    description: 'Efecto mate sin peso para cortes messy crop y texturizados modernos.',
    color: '#475569'
  },
  {
    id: 'barb-prod-03',
    code: 'PROD-03',
    name: 'Aceite de Crecimiento & Cuidado de Barba (30ml)',
    category: 'producto',
    categoryLabel: 'Venta en Silla',
    defaultPriceUSD: 15.0,
    durationMin: 0,
    description: 'Aceite de jojoba, argán y ricino con fragancia amaderada.',
    color: '#475569'
  }
];

/**
 * Combina el catálogo de barbería con los productos y servicios del tenant
 */
export function mergeTenantBarberServices(
  tenantItems: Array<{ id: string; name: string; base_price?: number; type?: string; metadata?: any }>
): BarberServiceDefinition[] {
  const customList: BarberServiceDefinition[] = [];

  for (const item of tenantItems || []) {
    if (item.type === 'service' || item.type === 'product') {
      const match = BARBER_SERVICES_MASTER.find(
        b => b.name.toLowerCase() === item.name.toLowerCase()
      );

      if (match) {
        customList.push({
          ...match,
          id: item.id,
          defaultPriceUSD: Number(item.base_price || match.defaultPriceUSD),
        });
      } else if (item.metadata?.vertical === 'barberia' || item.metadata?.category?.includes('barber')) {
        customList.push({
          id: item.id,
          code: `BARB-${item.id.slice(0, 4).toUpperCase()}`,
          name: item.name,
          category: item.type === 'product' ? 'producto' : 'corte',
          categoryLabel: item.type === 'product' ? 'Venta en Silla' : 'Servicio Especial',
          defaultPriceUSD: Number(item.base_price || 12),
          durationMin: Number(item.metadata?.durationMin || 30),
          description: item.name,
          color: '#d97706'
        });
      }
    }
  }

  for (const master of BARBER_SERVICES_MASTER) {
    if (!customList.some(c => c.name.toLowerCase() === master.name.toLowerCase())) {
      customList.push(master);
    }
  }

  return customList;
}
