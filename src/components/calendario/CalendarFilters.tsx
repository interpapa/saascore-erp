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
  List,
  Layers,
  Check,
} from 'lucide-react';
import {
  Appointment,
  AppointmentFilterState,
  AppointmentStatus,
  Employee,
  Service,
} from '@/types/calendario';

export interface CalendarFiltersProps {
  viewMode: 'day' | 'month' | 'week' | 'agenda';
  onViewModeChange: (mode: 'day' | 'month' | 'week' | 'agenda') => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  filterState: AppointmentFilterState;
  onFilterChange: (filters: AppointmentFilterState) => void;
  employees: Employee[];
  services: Service[];
  onOpenCreateModal: (type?: 'appointment' | 'block') => void;
  appointments?: Appointment[];
  onSelectAppointment?: (appt: Appointment) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function CalendarFilters({
  viewMode,
  onViewModeChange,
  currentDate,
  onDateChange,
  filterState,
  onFilterChange,
  employees,
  onOpenCreateModal,
  appointments = [],
  onSelectAppointment,
}: CalendarFiltersProps) {
  const [isJumpPopoverOpen, setIsJumpPopoverOpen] = React.useState(false);
  const [selectorYear, setSelectorYear] = React.useState(currentDate.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = React.useState(currentDate.getMonth());
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Sync selector with currentDate when changed outside
  React.useEffect(() => {
    setSelectorYear(currentDate.getFullYear());
    setSelectedMonthIndex(currentDate.getMonth());
  }, [currentDate]);

  // Click outside to close popover
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsJumpPopoverOpen(false);
      }
    };
    if (isJumpPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isJumpPopoverOpen]);

  // Filtrado de citas para el buscador predictivo
  const matchingAppointments = React.useMemo(() => {
    if (!filterState.search || filterState.search.trim().length < 2) return [];
    const q = filterState.search.toLowerCase().trim();
    return appointments.filter(a => 
      (a.client_name && a.client_name.toLowerCase().includes(q)) ||
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.service_name && a.service_name.toLowerCase().includes(q)) ||
      (a.employee_name && a.employee_name.toLowerCase().includes(q))
    );
  }, [appointments, filterState.search]);

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
    if (viewMode === 'agenda') {
      return `Agenda de ${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
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

  // Calcular las semanas del mes seleccionado en el selector
  const calculatedWeeks = React.useMemo(() => {
    const year = selectorYear;
    const month = selectedMonthIndex;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: Array<{
      weekNumber: number;
      startDate: Date;
      endDate: Date;
      label: string;
      rangeText: string;
    }> = [];

    let currentDay = 1;
    let weekIndex = 1;

    while (currentDay <= daysInMonth) {
      const startDate = new Date(year, month, currentDay);
      const dayOfWeek = startDate.getDay(); // 0 is Sunday
      const daysUntilSaturday = 6 - dayOfWeek;
      const endDay = Math.min(daysInMonth, currentDay + daysUntilSaturday);
      const endDate = new Date(year, month, endDay);

      weeks.push({
        weekNumber: weekIndex,
        startDate,
        endDate,
        label: `Semana ${weekIndex}`,
        rangeText: `${currentDay} al ${endDay} de ${MONTH_NAMES[month]}`,
      });

      currentDay = endDay + 1;
      weekIndex++;
    }

    return weeks;
  }, [selectorYear, selectedMonthIndex]);

  return (
    <div className="bg-card border border-border p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
      {/* Top Row: View Switcher, Period Nav & CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: View Mode Segmented Control & Title */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center justify-between sm:justify-start gap-1 border border-border w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => onViewModeChange('day')}
              className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
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
              className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
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
              className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                viewMode === 'month'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <Grid size={14} />
              Mes
            </button>
            <button
              onClick={() => onViewModeChange('agenda')}
              className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                viewMode === 'agenda'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
              title="Ver lista cronológica de citas"
            >
              <List size={14} />
              Agenda
            </button>
          </div>

          {/* Period Title con Selector Jerárquico de Mes / Semanas */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setIsJumpPopoverOpen(!isJumpPopoverOpen)}
              className="group flex items-center gap-2 p-1.5 -ml-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Hacer clic para saltar a cualquier mes o semana"
            >
              <h2 className="text-base sm:text-lg md:text-xl font-black text-foreground capitalize tracking-tight text-left truncate flex items-center gap-1.5">
                <span>{getPeriodTitle()}</span>
                <ChevronRight size={16} className={`text-slate-400 group-hover:text-primary transition-transform ${isJumpPopoverOpen ? 'rotate-90' : ''}`} />
              </h2>
            </button>

            {/* Popover selector de Mes -> Semanas -> Días */}
            {isJumpPopoverOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 animate-in fade-in zoom-in-95">
                {/* Year Navigator */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Saltar a Período</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectorYear(y => y - 1)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-black text-foreground px-2">{selectorYear}</span>
                    <button
                      type="button"
                      onClick={() => setSelectorYear(y => y + 1)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Meses Grid */}
                <div className="pt-3">
                  <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center justify-between">
                    <span>1. Selecciona el Mes</span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = new Date(selectorYear, selectedMonthIndex, 1);
                        onDateChange(target);
                        onViewModeChange('month');
                        setIsJumpPopoverOpen(false);
                      }}
                      className="text-primary hover:underline text-xs font-bold"
                    >
                      Ver Mes Completo ➔
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MONTH_NAMES.map((name, idx) => {
                      const isSelected = selectedMonthIndex === idx;
                      const isCurrentMonth = new Date().getMonth() === idx && new Date().getFullYear() === selectorYear;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setSelectedMonthIndex(idx)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : isCurrentMonth
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {name.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Semanas del Mes Seleccionado */}
                <div className="pt-4 border-t border-border mt-3">
                  <div className="text-[11px] font-bold text-slate-500 mb-2">
                    2. Selecciona la Semana de {MONTH_NAMES[selectedMonthIndex]}
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
                    {calculatedWeeks.map((week) => (
                      <button
                        key={week.weekNumber}
                        type="button"
                        onClick={() => {
                          onDateChange(week.startDate);
                          onViewModeChange('week');
                          setIsJumpPopoverOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                            {week.label}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {week.rangeText}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver Semana ➔
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Date Navigation & Primary CTA */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full lg:w-auto">
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

          <div className="flex gap-2">
            <button
              onClick={() => onOpenCreateModal('block')}
              className="flex-1 sm:flex-none justify-center bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm btn-haptic shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Bloquear
            </button>
            <button
              onClick={() => onOpenCreateModal('appointment')}
              className="flex-1 sm:flex-none justify-center bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm btn-haptic shrink-0"
            >
              <Plus size={16} />
              Agendar
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
        {/* Search input con Predictivo Inteligente */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar cita por cliente, doctor o servicio..."
            value={filterState.search || ''}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
            onChange={(e) =>
              onFilterChange({ ...filterState, search: e.target.value })
            }
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />

          {/* Dropdown Predictivo de Citas Encontradas */}
          {isSearchFocused && matchingAppointments.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Citas Encontradas</span>
                <span>{matchingAppointments.length} resultado(s)</span>
              </div>
              {matchingAppointments.slice(0, 6).map((appt) => {
                const apptDate = new Date(appt.start_time);
                return (
                  <button
                    key={appt.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onDateChange(apptDate);
                      onViewModeChange('day');
                      if (onSelectAppointment) onSelectAppointment(appt);
                      onFilterChange({ ...filterState, search: '' });
                      setIsSearchFocused(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {appt.client_name || appt.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {appt.service_name || 'Servicio'} {appt.employee_name ? `• ${appt.employee_name}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-primary text-[11px]">
                        {apptDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {apptDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
