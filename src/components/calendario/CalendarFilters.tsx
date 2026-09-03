'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  UserCheck,
  Calendar as CalendarIcon,
  Grid,
  Clock,
} from 'lucide-react';
import {
  AppointmentFilterState,
  AppointmentStatus,
  Employee,
  Service,
} from '@/types/calendario';

export interface CalendarFiltersProps {
  viewMode: 'day' | 'month' | 'week';
  onViewModeChange: (mode: 'day' | 'month' | 'week') => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  filterState: AppointmentFilterState;
  onFilterChange: (filters: AppointmentFilterState) => void;
  employees: Employee[];
  services: Service[];
  onOpenCreateModal: () => void;
}

export function CalendarFilters({
  viewMode,
  onViewModeChange,
  currentDate,
  onDateChange,
  filterState,
  onFilterChange,
  employees,
  onOpenCreateModal,
}: CalendarFiltersProps) {
  // Navigation handlers
  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') {
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      nextDate.setDate(nextDate.getDate() - 7);
    } else {
      nextDate.setDate(nextDate.getDate() - 1);
    }
    onDateChange(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') {
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    onDateChange(nextDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Period Title Formatter
  const getPeriodTitle = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }
    // Week view title calculation
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startDay = startOfWeek.getDate();
    const endDay = endOfWeek.getDate();
    const monthName = endOfWeek.toLocaleDateString('es-ES', { month: 'long' });
    const year = endOfWeek.getFullYear();

    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
      return `${startDay} - ${endDay} de ${monthName}, ${year}`;
    }
    const startMonth = startOfWeek.toLocaleDateString('es-ES', { month: 'short' });
    return `${startDay} ${startMonth} - ${endDay} ${monthName}, ${year}`;
  };

  return (
    <div className="bg-card border border-border p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
      {/* Top Row: View Switcher, Period Nav & CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: View Mode Segmented Control */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1 border border-border">
            <button
              onClick={() => onViewModeChange('day')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'day'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <Clock size={14} />
              Día
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'week'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <CalendarIcon size={14} />
              Semana
            </button>
            <button
              onClick={() => onViewModeChange('month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <Grid size={14} />
              Mes
            </button>
          </div>

          {/* Period Title */}
          <h2 className="text-lg sm:text-xl font-black text-foreground capitalize tracking-tight">
            {getPeriodTitle()}
          </h2>
        </div>

        {/* Right: Date Navigation & Primary CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-border">
            <button
              onClick={handlePrev}
              aria-label="Anterior"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              aria-label="Siguiente"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm btn-haptic shrink-0"
          >
            <Plus size={16} />
            Agendar Cita
          </button>
        </div>
      </div>

      {/* Bottom Row: Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
        {/* Search input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por cliente o título..."
            value={filterState.search || ''}
            onChange={(e) =>
              onFilterChange({ ...filterState, search: e.target.value })
            }
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Employee Filter */}
        <div className="relative">
          <UserCheck
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <select
            value={filterState.employee_id || 'all'}
            onChange={(e) =>
              onFilterChange({ ...filterState, employee_id: e.target.value })
            }
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Todos los Empleados</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <select
            value={filterState.status || 'all'}
            onChange={(e) =>
              onFilterChange({
                ...filterState,
                status: e.target.value as AppointmentStatus | 'all',
              })
            }
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Todos los Estados</option>
            <option value="scheduled">Programadas</option>
            <option value="confirmed">Confirmadas</option>
            <option value="in_progress">En Curso</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="no_show">No Asistió</option>
          </select>
        </div>
      </div>
    </div>
  );
}
