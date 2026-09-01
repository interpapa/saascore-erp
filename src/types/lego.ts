// Definiciones del ADN del Motor Lego

export type LegoPieceType = 'stat-grid' | 'list-feed' | 'action-grid' | 'form' | 'kpi-bar';

export interface LegoPieceDNA {
  id: string;
  type: LegoPieceType;
  span?: 'full' | 'half'; // Controla si ocupa toda la pantalla o la mitad (Bento Grid)
  colSpan?: number;        // Alternativa numérica de span para LegoStudio
  config: unknown; // Configuración específica de cada ladrillo (títulos, campos a mostrar)
  dataSource?: string; // Nombre del origen de datos simulado o real
  isLocked?: boolean; // Bloqueo legal/fiscal: Si es true, el usuario no puede editar su config en LegoStudio
}

export interface LegoModuleDNA {
  moduleId: string;
  name: string;
  layout: LegoPieceDNA[];
}
