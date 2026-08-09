'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { CalendarKPIs } from '@/components/calendario/CalendarKPIs';
import { CalendarFilters } from '@/components/calendario/CalendarFilters';
import { CalendarGrid } from '@/components/calendario/CalendarGrid';
import { AppointmentModal } from '@/components/calendario/AppointmentModal';
import { AppointmentDetailsModal } from '@/components/calendario/AppointmentDetailsModal';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import {
  getAppointmentsAction,
  createAppointmentAction,
  updateAppointmentStatusAction,
} from '@/app/actions/appointments';
import { getEntitiesAction } from '@/app/actions/entities';
import { Entity } from '@/lib/api/entities';
import { getItemsAction } from '@/app/actions/items';
import {
  Appointment,
  AppointmentFilterState,
  AppointmentStatus,
  CreateAppointmentInput,
  Employee,
  Service,
} from '@/types/calendario';

export default function CalendarioPage() {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Primary Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Navigation States
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [filterState, setFilterState] = useState<AppointmentFilterState>({
    status: 'all',
    employee_id: 'all',
    service_id: 'all',
    search: '',
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  // Fetch Data Function
  const fetchData = useCallback(async () => {
    if (!currentTenant) return;
    try {
      setIsLoading(true);
      const [apptsRes, empRes, custRes, srvRes] = await Promise.all([
        getAppointmentsAction(currentTenant.id, filterState),
        getEntitiesAction(currentTenant.id, 'employee'),
        getEntitiesAction(currentTenant.id, 'customer'),
        getItemsAction(currentTenant.id, 'service'),
      ]);

      if (apptsRes.success) {
        setAppointments(apptsRes.appointments || []);
      } else {
        toast({
          variant: 'error',
          title: 'Error al cargar citas',
          description: apptsRes.error || 'No se pudieron recuperar las citas.',
        });
      }

      if (empRes.success) {
        const mappedEmps: Employee[] = (empRes.entities || []).map((e: any) => ({
          id: e.id,
          tenant_id: e.tenant_id,
          name: e.name,
          email: e.email,
          phone: e.phone,
          role: e.metadata?.role || 'Empleado',
          is_active: e.status === 'active',
        }));
        setEmployees(mappedEmps);
      }

      if (custRes.success) {
        setClients(custRes.entities || []);
      }

      if (srvRes.success) {
        const mappedServices: Service[] = (srvRes.items || []).map((s: any) => ({
          id: s.id,
          tenant_id: s.tenant_id,
          name: s.name,
          description: s.description,
          duration_minutes: s.metadata?.duration_minutes || 60,
          price: s.base_price || 0,
          is_active: s.is_active ?? true,
        }));
        setServices(mappedServices);
      }
    } catch (err: any) {
      console.error('[CalendarioPage Fetch Error]:', err);
      toast({
        variant: 'error',
        title: 'Error de red',
        description: 'Fallo al comunicarse con el servidor.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, filterState, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler for Create Appointment with Optimistic UI Update
  const handleCreateAppointment = async (input: CreateAppointmentInput) => {
    if (!currentTenant) {
      toast({ variant: 'error', title: 'Sin empresa activa' });
      return;
    }

    // Prepare optimistic appointment
    const clientName = clients.find((c) => c.id === input.client_id)?.name || 'Cliente';
    const employeeName = employees.find((e) => e.id === input.employee_id)?.name || 'Sin Asignar';
    const serviceName = services.find((s) => s.id === input.service_id)?.name || 'Servicio';

    const optimisticId = `temp-${Date.now()}`;
    const optimisticAppt: Appointment = {
      id: optimisticId,
      tenant_id: currentTenant.id,
      title: input.title,
      description: input.description,
      client_id: input.client_id,
      client_name: clientName,
      service_id: input.service_id,
      service_name: serviceName,
      employee_id: input.employee_id,
      employee_name: employeeName,
      start_time: input.start_time,
      end_time: input.end_time || new Date(new Date(input.start_time).getTime() + (input.duration_minutes || 60) * 60000).toISOString(),
      status: input.status || 'scheduled',
      notes: input.notes,
      price: input.price || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistically insert item
    setAppointments((prev) => [optimisticAppt, ...prev]);

    try {
      const res = await createAppointmentAction(input, currentTenant.id, actor);

      if (res.success && res.appointment) {
        // Replace temp item with real server item
        setAppointments((prev) =>
          prev.map((a) => (a.id === optimisticId ? res.appointment! : a))
        );
        toast({
          variant: 'success',
          title: 'Cita agendada',
          description: `Se agendó la cita "${input.title}" exitosamente.`,
        });
      } else {
        // Revert optimistic insert
        setAppointments((prev) => prev.filter((a) => a.id !== optimisticId));
        toast({
          variant: 'error',
          title: 'Error al agendar',
          description: res.error || 'No se pudo guardar la cita.',
        });
      }
    } catch (err: any) {
      setAppointments((prev) => prev.filter((a) => a.id !== optimisticId));
      toast({
        variant: 'error',
        title: 'Error inesperado',
        description: err.message || 'Ocurrió un error al procesar la cita.',
      });
    }
  };

  // Handler for Update Status with Optimistic UI Update
  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    if (!currentTenant) return;

    // Save current status for potential rollback
    const originalAppt = appointments.find((a) => a.id === id);
    if (!originalAppt) return;
    const oldStatus = originalAppt.status;

    // Optimistically update local status
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );

    try {
      const res = await updateAppointmentStatusAction(id, status, currentTenant.id, actor);

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Estado actualizado',
          description: `La cita ahora está en estado "${status}".`,
        });
      } else {
        // Revert status
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: oldStatus } : a))
        );
        toast({
          variant: 'error',
          title: 'Error al cambiar estado',
          description: res.error || 'No se pudo actualizar el estado.',
        });
      }
    } catch (err: any) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: oldStatus } : a))
      );
      toast({
        variant: 'error',
        title: 'Error inesperado',
        description: err.message || 'Error al actualizar el estado.',
      });
    }
  };

  // Open Create Modal for a specific date slot
  const handleSelectDateSlot = (date: Date) => {
    setSelectedDateForCreate(date);
    setIsCreateModalOpen(true);
  };

  // Open Details Modal for an appointment
  const handleSelectAppointment = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Gestión de Citas y Turnos
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
            Control de agenda, personal asignado y estados de servicio
          </p>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <CalendarKPIs appointments={appointments} />

      {/* Filters & View Switcher */}
      <CalendarFilters
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        filterState={filterState}
        onFilterChange={setFilterState}
        employees={employees}
        services={services}
        onOpenCreateModal={() => {
          setSelectedDateForCreate(null);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Interactive Monthly / Weekly Event Grid */}
      <CalendarGrid
        viewMode={viewMode}
        currentDate={currentDate}
        appointments={appointments}
        isLoading={isLoading}
        onSelectAppointment={handleSelectAppointment}
        onSelectDateSlot={handleSelectDateSlot}
        onOpenCreateModal={() => {
          setSelectedDateForCreate(null);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Create Appointment Modal */}
      <AppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedDateForCreate(null);
        }}
        onSave={handleCreateAppointment}
        employees={employees}
        services={services}
        clients={clients}
        initialDate={selectedDateForCreate}
      />

      {/* Appointment Details & Status Transition Modal */}
      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
