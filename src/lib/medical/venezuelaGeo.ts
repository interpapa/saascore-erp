/**
 * Catálogo Geográfico de Venezuela
 * 24 Entidades Federales (23 Estados + Distrito Capital) y sus principales Ciudades / Municipios.
 * Permite selección en cascada y auto-completado de direcciones sin tipeo manual.
 */

export interface VenezuelaGeoState {
  state: string;
  cities: string[];
}

export const VENEZUELA_GEO_DATA: VenezuelaGeoState[] = [
  {
    state: 'Distrito Capital',
    cities: [
      'Caracas',
      'Municipio Libertador',
      'El Recreo',
      'Sucre (Catia)',
      'San Pedro',
      'El Valle',
      'La Pastora',
      'Antímano',
      'Caricuao',
      'La Candelaria',
      'San Juan',
      'San Bernardino',
      'El Paraíso',
      'Altagracia',
      'Santa Rosalía'
    ]
  },
  {
    state: 'Miranda',
    cities: [
      'Los Teques',
      'Chacao',
      'Baruta',
      'El Hatillo',
      'Sucre (Petare / La California)',
      'Guarenas',
      'Guatire',
      'San Antonio de los Altos',
      'Charallave',
      'Cúa',
      'Ocumare del Tuy',
      'Santa Teresa del Tuy',
      'Higuerote',
      'Río Chico',
      'Carrizal',
      'San Francisco de Yare'
    ]
  },
  {
    state: 'Carabobo',
    cities: [
      'Valencia',
      'Naguanagua',
      'San Diego',
      'Guacara',
      'Puerto Cabello',
      'Los Guayos',
      'Mariara',
      'Tocuyito',
      'Bejuma',
      'Morón',
      'San Joaquín',
      'Güigüe'
    ]
  },
  {
    state: 'Aragua',
    cities: [
      'Maracay',
      'Turmero',
      'La Victoria',
      'Cagua',
      'El Limón',
      'Villa de Cura',
      'Palo Negro',
      'Santa Cruz de Aragua',
      'San Mateo',
      'Las Tejerías',
      'Ocumare de la Costa',
      'Choroní'
    ]
  },
  {
    state: 'Zulia',
    cities: [
      'Maracaibo',
      'San Francisco',
      'Cabimas',
      'Ciudad Ojeda',
      'Machiques',
      'Santa Bárbara del Zulia',
      'La Concepción',
      'Villa del Rosario',
      'Los Puertos de Altagracia',
      'Bachaquero',
      'Mene Grande',
      'San Carlos del Zulia'
    ]
  },
  {
    state: 'Lara',
    cities: [
      'Barquisimeto',
      'Cabudare',
      'Carora',
      'El Tocuyo',
      'Quíbor',
      'Duaca',
      'Sanare',
      'Siquisique',
      'Sarare'
    ]
  },
  {
    state: 'Anzoátegui',
    cities: [
      'Barcelona',
      'Puerto La Cruz',
      'Lechería',
      'Guanta',
      'El Tigre',
      'Anaco',
      'Cantaura',
      'Pariaguán',
      'Clarines',
      'Puerto Píritu',
      'Aragua de Barcelona',
      'San José de Guanipa'
    ]
  },
  {
    state: 'Bolívar',
    cities: [
      'Ciudad Guayana (Puerto Ordaz)',
      'Ciudad Guayana (San Félix)',
      'Ciudad Bolívar',
      'Upata',
      'Caicara del Orinoco',
      'Santa Elena de Uairén',
      'El Callao',
      'Tumeremo',
      'Guasipati'
    ]
  },
  {
    state: 'La Guaira (Vargas)',
    cities: [
      'La Guaira',
      'Catia La Mar',
      'Maiquetía',
      'Macuto',
      'Caraballeda',
      'Naiguatá',
      'Carayaca'
    ]
  },
  {
    state: 'Táchira',
    cities: [
      'San Cristóbal',
      'Táriba',
      'Rubio',
      'San Antonio del Táchira',
      'Ureña',
      'La Grita',
      'Coloncito',
      'Michelena',
      'Capacho Nuevo',
      'Capacho Viejo',
      'La Fría'
    ]
  },
  {
    state: 'Mérida',
    cities: [
      'Mérida',
      'El Vigía',
      'Ejido',
      'Tovar',
      'Mucuchíes',
      'Lagunillas',
      'Bailadores',
      'Santa Cruz de Mora',
      'Timotes'
    ]
  },
  {
    state: 'Nueva Esparta',
    cities: [
      'Porlamar',
      'Pampatar',
      'La Asunción',
      'Juan Griego',
      'Valle del Espíritu Santo',
      'Punta de Piedras',
      'Santa Ana',
      'San Juan Bautista'
    ]
  },
  {
    state: 'Monagas',
    cities: [
      'Maturín',
      'Punta de Mata',
      'Caripe',
      'Caripito',
      'Temblador',
      'Caicara de Maturín',
      'Barrancas del Orinoco'
    ]
  },
  {
    state: 'Falcón',
    cities: [
      'Coro',
      'Punto Fijo',
      'Puerto Cumarebo',
      'Dabajuro',
      'Chichiriviche',
      'Tucacas',
      'Churuguara',
      'Mene de Mauroa',
      'La Vela de Coro'
    ]
  },
  {
    state: 'Portuguesa',
    cities: [
      'Acarigua',
      'Araure',
      'Guanare',
      'Turén',
      'Ospino',
      'Biscucuy',
      'Villa Bruzual'
    ]
  },
  {
    state: 'Sucre',
    cities: [
      'Cumaná',
      'Carúpano',
      'Güiria',
      'Cariaco',
      'Casanay',
      'El Pilar',
      'Río Caribe',
      'Marigüitar'
    ]
  },
  {
    state: 'Barinas',
    cities: [
      'Barinas',
      'Barinitas',
      'Socopó',
      'Santa Bárbara de Barinas',
      'Pedraza (Ciudad Bolivia)',
      'Sabaneta'
    ]
  },
  {
    state: 'Guárico',
    cities: [
      'San Juan de los Morros',
      'Calabozo',
      'Valle de la Pascua',
      'Zaraza',
      'Altagracia de Orituco',
      'Tucupido',
      'El Sombrero'
    ]
  },
  {
    state: 'Yaracuy',
    cities: [
      'San Felipe',
      'Yaritagua',
      'Chivacoa',
      'Nirgua',
      'Cocorote',
      'Guama',
      'Aroa'
    ]
  },
  {
    state: 'Trujillo',
    cities: [
      'Valera',
      'Trujillo',
      'Boconó',
      'Betijoque',
      'Carache',
      'Sabana de Mendoza',
      'Pampán'
    ]
  },
  {
    state: 'Cojedes',
    cities: [
      'San Carlos',
      'Tinaquillo',
      'Tinaco',
      'El Baúl',
      'Macapo',
      'El Pao'
    ]
  },
  {
    state: 'Apure',
    cities: [
      'San Fernando de Apure',
      'Biruaca',
      'Achaguas',
      'Guasdualito',
      'Elorza',
      'Mantecal'
    ]
  },
  {
    state: 'Delta Amacuro',
    cities: [
      'Tucupita',
      'Pedernales',
      'Curiapo',
      'Sierra Imataca'
    ]
  },
  {
    state: 'Amazonas',
    cities: [
      'Puerto Ayacucho',
      'San Fernando de Atabapo',
      'Maroa',
      'San Carlos de Río Negro'
    ]
  }
];

export const VENEZUELA_STATES: string[] = VENEZUELA_GEO_DATA.map((d) => d.state);

/**
 * Obtiene las ciudades correspondientes a un estado.
 */
export function getCitiesForState(stateName: string): string[] {
  if (!stateName) return [];
  const found = VENEZUELA_GEO_DATA.find(
    (s) => s.state.toLowerCase().trim() === stateName.toLowerCase().trim()
  );
  return found ? found.cities : [];
}

/**
 * Dado el nombre de una ciudad, encuentra el estado al que pertenece.
 */
export function findStateForCity(cityName: string): string | null {
  if (!cityName) return null;
  const cleanCity = cityName.toLowerCase().trim();
  for (const s of VENEZUELA_GEO_DATA) {
    if (s.cities.some((c) => c.toLowerCase().trim() === cleanCity)) {
      return s.state;
    }
  }
  return null;
}
