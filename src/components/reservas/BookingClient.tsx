// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Scissors, Clock, Calendar, User, Users, ChevronRight } from 'lucide-react';
import { processBookingAction, getBookedTimesAction } from '@/app/actions/booking';

type Tenant = { id: string, name: string, metadata?: any };
type Employee = { id: string, name: string, role: string, is_active: boolean, metadata?: any };

const toLocalDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isSlotAvailable = (time24: string, durationMinutes: number = 30, booked: string[]): boolean => {
  const [h, m] = time24.split(':').map(Number);
  const startMins = h * 60 + m;
  const segments = Math.max(1, Math.ceil(durationMinutes / 15));
  for (let s = 0; s < segments; s++) {
    const currentMins = startMins + s * 15;
    const curH = Math.floor(currentMins / 60).toString().padStart(2, '0');
    const curM = (currentMins % 60).toString().padStart(2, '0');
    const key = `${curH}:${curM}`;
    if (booked.includes(key)) {
      return false;
    }
  }
  return true;
};

const GENERATE_DATES = (allEmployees: Employee[], barber?: Employee | null, maxDays: number = 14) => {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  const mappingDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  let attempts = 0;
  
  while (dates.length < maxDays && attempts < 90) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + attempts);
    const dayKey = mappingDays[d.getDay()];
    
    let isWorkingDay = false;
    
    if (barber && barber.id !== 'any') {
      const shifts = barber.metadata?.working_hours?.[dayKey] || [];
      isWorkingDay = shifts.length > 0;
    } else {
      isWorkingDay = allEmployees.some(emp => {
        if (!emp.is_active) return false;
        const shifts = emp.metadata?.working_hours?.[dayKey] || [];
        return shifts.length > 0;
      });
    }
    
    if (isWorkingDay) {
      dates.push({
        dateObj: d,
        dayName: attempts === 0 ? 'HOY' : dayNames[d.getDay()],
        dayNum: d.getDate(),
        fullDate: toLocalDateString(d),
        dayKey: mappingDays[d.getDay()]
      });
    }
    attempts++;
  }
  return dates;
};

const normalizeWhatsAppPhone = (rawPhone?: string | null, defaultCountry = '58'): string => {
  if (!rawPhone) return '';
  let clean = rawPhone.replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    clean = defaultCountry + clean.slice(1);
  } else if (clean.length === 10 && (clean.startsWith('412') || clean.startsWith('414') || clean.startsWith('424') || clean.startsWith('416') || clean.startsWith('426'))) {
    clean = defaultCountry + clean;
  }
  return clean;
};

const parseTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hr24 = h.toString().padStart(2, '0');
  const min = m.toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  
  return {
    value24: `${hr24}:${min}`,
    label12: `${h12}:${min} ${ampm}`
  };
};

const GENERATE_TIMES = (
  globalStart: string, 
  globalEnd: string, 
  interval: number, 
  shifts?: {start: string, end: string}[]
) => {
  // Guardia defensiva: intervalo mínimo de 5 minutos para prevenir bucles infinitos (DoS en navegador)
  const safeInterval = Math.max(5, Number(interval) || 30);
  const times = [];
  
  if (shifts && shifts.length > 0) {
    for (const shift of shifts) {
      const startMins = parseTime(shift.start);
      const endMins = parseTime(shift.end);
      for (let m = startMins; m < endMins; m += safeInterval) {
        times.push(formatTime(m));
      }
    }
  } else {
    const startMins = parseTime(globalStart);
    const endMins = parseTime(globalEnd);
    for (let m = startMins; m < endMins; m += safeInterval) {
      times.push(formatTime(m));
    }
  }
  
  return times;
};

export default function BookingClient({ tenant, employees, theme }: { tenant: Tenant, employees: Employee[], theme?: { bgColor: string; btnColor: string } }) {
  // Theme handling
  const defaultTheme = { bgColor: "#ffffff", btnColor: "#0B3B24" };
  const appliedTheme = theme ?? defaultTheme;
  const rootStyle = {
    "--theme-bg": appliedTheme.bgColor,
    "--theme-btn": appliedTheme.btnColor,
  } as React.CSSProperties;

  const rawConfiguredPhone = tenant.metadata?.booking_settings?.whatsappNumber 
    || (tenant.metadata as any)?.phone 
    || (tenant as any)?.phone 
    || '';

  const settings = {
    openDays: tenant.metadata?.booking_settings?.openDays || [1, 2, 3, 4, 5, 6],
    startHour: tenant.metadata?.booking_settings?.startHour || '09:00',
    endHour: tenant.metadata?.booking_settings?.endHour || '18:00',
    intervalMinutes: tenant.metadata?.booking_settings?.intervalMinutes || 30,
    maxDaysInAdvance: tenant.metadata?.booking_settings?.maxDaysInAdvance || 14,
    whatsappNumber: rawConfiguredPhone,
    resourceName: tenant.metadata?.booking_settings?.resourceName || 'Profesional',
    whatsappMessageTemplate: tenant.metadata?.booking_settings?.whatsappMessageTemplate || '¡Hola! Quiero confirmar mi reserva con {{profesional}} para el día {{fecha}} a las {{hora}}. Mi nombre es {{cliente}}.',
    showPrices: tenant.metadata?.booking_settings?.showPricesOnBookingPage !== false,
    noPriceLabel: tenant.metadata?.booking_settings?.noPriceLabel || 'A convenir',
    logoUrl: tenant.metadata?.booking_settings?.logoUrl 
      || tenant.metadata?.public_theme?.logoUrl
      || (tenant.metadata as any)?.logo_url 
      || '',
    headerTitle: tenant.metadata?.booking_settings?.headerTitle || tenant.name,
    headerSubtitle: tenant.metadata?.booking_settings?.headerSubtitle || '¿Qué necesitas hoy? Selecciona el servicio.',
  };

  const resourceName = settings.resourceName;

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<{name: string, durationMinutes: number, priceText?: string, basePrice?: number, isCustomPrice?: boolean} | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Employee | null>(null);
  const [selectedBarberPrice, setSelectedBarberPrice] = useState<number | undefined>(undefined);

  // Extract unique services from all employees (Memoized)
  const uniqueServices = useMemo(() => {
    interface ServiceAgg {
      name: string;
      durationMinutes: number;
      prices: number[];
      hasFrom: boolean;
      hasHidden: boolean;
      basePrice?: number;
    }
    const allServices = new Map<string, ServiceAgg>();
    
    employees.forEach(emp => {
      if (!emp.is_active) return;
      const svcs = emp.metadata?.services as any[];
      if (svcs && svcs.length > 0) {
        svcs.forEach(s => {
          const key = s.name.trim().toLowerCase();
          if (!allServices.has(key)) {
            allServices.set(key, {
              name: s.name.trim(),
              durationMinutes: Number(s.durationMinutes) || 60,
              prices: [],
              hasFrom: false,
              hasHidden: false,
              basePrice: s.price !== undefined && Number(s.price) > 0 ? Number(s.price) : undefined,
            });
          }
          const entry = allServices.get(key)!;
          if (s.price !== undefined && Number(s.price) > 0) {
            entry.prices.push(Number(s.price));
            if (!entry.basePrice) entry.basePrice = Number(s.price);
          }
          if (s.priceDisplay === 'from') entry.hasFrom = true;
          if (s.priceDisplay === 'hidden') entry.hasHidden = true;
        });
      } else {
        const role = emp.role || 'Servicio General';
        const key = role.trim().toLowerCase();
        if (!allServices.has(key)) {
          allServices.set(key, {
            name: role.trim(),
            durationMinutes: 60,
            prices: [],
            hasFrom: false,
            hasHidden: false,
          });
        }
      }
    });

    return Array.from(allServices.values()).map(s => {
      let priceText = '';
      if (settings.showPrices) {
        if (s.hasHidden || s.prices.length === 0) {
          priceText = settings.noPriceLabel;
        } else {
          const minP = Math.min(...s.prices);
          const maxP = Math.max(...s.prices);
          if (s.hasFrom || minP !== maxP) {
            priceText = `Desde $${minP}`;
          } else {
            priceText = `$${minP}`;
          }
        }
      }
      return {
        name: s.name,
        durationMinutes: s.durationMinutes,
        basePrice: s.basePrice,
        priceText: priceText,
        isCustomPrice: s.hasHidden || s.prices.length === 0,
      };
    });
  }, [employees, settings.showPrices, settings.noPriceLabel]);

  // Filter employees based on selected service (Memoized)
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!selectedService) return true;
      if (!emp.is_active) return false;
      const svcs = emp.metadata?.services as any[];
      if (svcs && svcs.length > 0) {
        return svcs.some(s => s.name.trim().toLowerCase() === selectedService.name.toLowerCase());
      } else {
        const role = emp.role || 'Servicio General';
        return role.trim().toLowerCase() === selectedService.name.toLowerCase();
      }
    });
  }, [employees, selectedService]);
  
  const dates = useMemo(() => {
    return GENERATE_DATES(employees, selectedBarber, settings.maxDaysInAdvance);
  }, [employees, selectedBarber, settings.maxDaysInAdvance]);
  
  // Re-adjust selected date if current selection is invalid for new barber
  const [selectedDate, setSelectedDate] = useState(dates.length > 0 ? dates[0].fullDate : '');
  
  useEffect(() => {
    if (dates.length > 0 && !dates.find(d => d.fullDate === selectedDate)) {
      setSelectedDate(dates[0].fullDate);
    }
  }, [dates, selectedDate]);

  const currentDayObj = dates.find(d => d.fullDate === selectedDate);
  const currentDayKey = currentDayObj ? currentDayObj.dayKey : 'monday';
  const shifts = selectedBarber?.metadata?.working_hours?.[currentDayKey];

  const slotInterval = selectedService?.durationMinutes || settings.intervalMinutes;
  
  const allTimes = useMemo(() => {
    return GENERATE_TIMES(
      settings.startHour, 
      settings.endHour, 
      slotInterval,
      shifts
    );
  }, [settings.startHour, settings.endHour, slotInterval, shifts]);
  
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Auto-completar datos guardados del cliente para evitar que los vuelva a escribir
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFirst = localStorage.getItem('rendo_client_firstname');
      const savedLast = localStorage.getItem('rendo_client_lastname');
      const savedPhone = localStorage.getItem('rendo_client_phone');
      if (savedFirst) setCustomerName(savedFirst);
      if (savedLast) setCustomerLastName(savedLast);
      if (savedPhone) setCustomerPhone(savedPhone);
    }
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const clientTzOffset = useMemo(() => {
    if (tenant.metadata?.booking_settings?.timezone_offset && /^[+-]\d{2}:\d{2}$/.test(tenant.metadata.booking_settings.timezone_offset)) {
      return tenant.metadata.booking_settings.timezone_offset;
    }
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
    const hours = Math.floor(Math.abs(offset) / 60);
    const mins = Math.abs(offset) % 60;
    return `${sign}${pad(hours)}:${pad(mins)}`;
  }, [tenant.metadata?.booking_settings?.timezone_offset]);

  useEffect(() => {
    let isCancelled = false;
    async function fetchTimes() {
      if (!selectedBarber || !selectedDate) return;
      setIsLoadingTimes(true);
      const result = await getBookedTimesAction(tenant.id, selectedBarber.id, selectedDate, clientTzOffset);
      if (!isCancelled && result.success) {
        setBookedTimes(result.bookedTimes);
      }
      if (!isCancelled) {
        setIsLoadingTimes(false);
      }
    }
    fetchTimes();
    return () => {
      isCancelled = true;
    };
  }, [selectedBarber, selectedDate, tenant.id, clientTzOffset]);

  const handleServiceSelect = (service: { name: string, durationMinutes: number, priceText?: string, basePrice?: number, isCustomPrice?: boolean }) => {
    setSelectedService(service);
    setStep(2);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleBarberSelect = (barber: Employee) => {
    setSelectedBarber(barber);
    if (barber.id !== 'any' && selectedService) {
      const bSvcs = barber.metadata?.services as any[];
      const bSvc = bSvcs?.find(s => s.name.trim().toLowerCase() === selectedService.name.toLowerCase());
      if (bSvc?.price !== undefined && Number(bSvc.price) > 0) {
        setSelectedBarberPrice(Number(bSvc.price));
      } else {
        setSelectedBarberPrice(selectedService.basePrice);
      }
    } else {
      setSelectedBarberPrice(selectedService?.basePrice);
    }
    setStep(3);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleConfirm = async () => {
    if (!selectedTime || !customerName || !customerPhone || !selectedBarber) {
      setErrorMessage('Por favor, completa todos los campos (Nombre y Teléfono).');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await processBookingAction({
        tenantId: tenant.id,
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        date: selectedDate,
        time: selectedTime,
        firstName: customerName,
        lastName: customerLastName,
        phone: customerPhone,
        durationMinutes: selectedService?.durationMinutes || 60,
        timezoneOffset: clientTzOffset,
        price: selectedBarberPrice || selectedService?.basePrice || 0,
        serviceName: selectedService?.name,
      });

      setIsSubmitting(false);

      if (!result?.success) {
        setErrorMessage(result?.error || 'Ocurrió un error inesperado');
        return;
      }

      // Guardar datos en localStorage para que el cliente no tenga que escribirlos en futuras reservas
      if (typeof window !== 'undefined') {
        localStorage.setItem('rendo_client_firstname', customerName);
        localStorage.setItem('rendo_client_lastname', customerLastName);
        localStorage.setItem('rendo_client_phone', customerPhone);
      }

      setSuccessMessage('¡Reserva confirmada con éxito!');
      
      // WhatsApp Redirection: Usa el número configurado dinámicamente en el módulo de Citas
      const cleanPhone = normalizeWhatsAppPhone(settings.whatsappNumber);
      const template = tenant.metadata?.booking_settings?.whatsappMessageTemplate || settings.whatsappMessageTemplate;
      const readableTime = allTimes.find(t => t.value24 === selectedTime)?.label12 || selectedTime;
      const assignedName = result.assignedBarberName || selectedBarber.name; // Usar el asignado si era 'cualquiera'
      
      const text = template
        .replace(/{{profesional}}/g, assignedName)
        .replace(/{{fecha}}/g, selectedDate)
        .replace(/{{hora}}/g, readableTime || '')
        .replace(/{{cliente}}/g, `${customerName} ${customerLastName}`.trim())
        .replace(/{{servicio}}/g, selectedService?.name || 'Servicio')
        .replace(/{{recurso}}/g, resourceName);

      const url = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
        
      setTimeout(() => {
        window.open(url, '_blank');
        setStep(1);
        setSelectedTime(null);
        // Mantener customerName, customerLastName y customerPhone para reservas subsecuentes
        setSuccessMessage('');
      }, 1500);

    } catch (err: any) {
      console.error('Error Calling Server Action:', err);
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Error de red o de servidor al enviar la reserva.');
      return;
    }
  };

  return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-800" style={rootStyle}>
      
      {/* ===== STEP 1: Seleccionar Servicio ===== */}
      {step === 1 && (
        <div className="min-h-screen flex flex-col">
          {/* Hero Banner */}
          <div className="bg-[color:var(--theme-btn)] px-6 py-10 md:px-12 md:py-14 lg:py-16">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-5 md:gap-7">
              {settings.logoUrl && (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white p-2.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
                  <img 
                    src={settings.logoUrl} 
                    alt={settings.headerTitle} 
                    className="max-w-full max-h-full object-contain rounded-xl"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div>
                <h1 className="text-white text-3xl md:text-5xl font-black mb-2 tracking-tight">
                  {settings.headerTitle}
                </h1>
                <p className="text-white/85 text-sm md:text-lg max-w-xl font-medium leading-relaxed">
                  {settings.headerSubtitle}
                </p>
              </div>
            </div>
          </div>
          
          {/* Service Cards */}
          <div className="flex-1 px-6 md:px-12 py-8 md:py-12">
            <div className="max-w-5xl mx-auto">
              {uniqueServices.length === 0 && (
                <p className="text-center text-slate-400 mt-10 text-lg">No hay servicios disponibles en este momento.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {uniqueServices.map((service, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleServiceSelect(service)}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:border-[color:var(--theme-btn)]/40 hover:shadow-lg text-left transition-all active:scale-[0.98] flex flex-col relative"
                  >
                    <div className="bg-slate-50 p-6 relative w-full flex items-center justify-between border-b border-slate-100">
                      <div>
                        <h2 className="text-xl md:text-2xl font-black text-[color:var(--theme-btn)]">{service.name}</h2>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-4 border-slate-50 shadow-sm">
                         <Scissors size={20} className="text-slate-400" />
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between w-full bg-white">
                      <div className="flex items-center gap-2.5 text-slate-500">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Clock size={14} className="text-slate-400" />
                          <span>{service.durationMinutes} min</span>
                        </div>
                        {settings.showPrices && service.priceText && (
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            service.isCustomPrice 
                              ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {service.priceText}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={18} className="text-[color:var(--theme-btn)] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Seleccionar Profesional ===== */}
      {step === 2 && (
        <div className="min-h-screen flex flex-col">
          {/* Hero Banner */}
          <div className="bg-[color:var(--theme-btn)] px-6 py-10 md:px-12 md:py-14 lg:py-16 relative">
            <button onClick={() => setStep(1)} className="absolute top-6 left-6 p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="max-w-5xl mx-auto mt-4 flex items-center gap-4">
              {settings.logoUrl && (
                <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-sm hidden sm:flex items-center justify-center shrink-0">
                  <img 
                    src={settings.logoUrl} 
                    alt="Logo" 
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div>
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest block mb-0.5">
                  {settings.headerTitle}
                </span>
                <h1 className="text-white text-2xl md:text-4xl font-black mb-1 tracking-tight">
                  {selectedService?.name || 'Profesional'}
                </h1>
                <p className="text-emerald-100/80 text-xs md:text-sm max-w-lg">
                  ¿Con qué especialista te gustaría agendar tu cita?
                </p>
              </div>
            </div>
          </div>
          
          {/* Employee Cards */}
          <div className="flex-1 px-6 md:px-12 py-8 md:py-12">
              <div className="max-w-5xl mx-auto">
                {filteredEmployees.length === 0 && (
                  <p className="text-center text-slate-400 mt-10 text-lg">No hay profesionales disponibles para este servicio.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredEmployees.length > 1 && (
                    <button
                      onClick={() => {
                        handleBarberSelect({ id: 'any', name: 'Cualquier Profesional', role: 'El que esté libre', is_active: true });
                      }}
                      className="group bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-700 hover:shadow-lg text-left transition-all active:scale-[0.98] flex flex-col relative"
                    >
                      <div className="p-6 relative w-full flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Sin preferencia</p>
                          <h2 className="text-xl md:text-2xl font-black text-white">Cualquiera disponible</h2>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-800 shadow-sm">
                           <Users className="text-slate-300 w-8 h-8" />
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between w-full bg-slate-800/50">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock size={16} />
                          <span className="text-sm font-medium">Horarios más flexibles</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                          <ChevronRight size={16} className="text-slate-300" />
                        </div>
                      </div>
                    </button>
                  )}
                  {filteredEmployees.map(barber => (
                    <button
                      key={barber.id}
                      onClick={() => handleBarberSelect(barber)}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:border-[color:var(--theme-btn)]/40 hover:shadow-lg text-left transition-all active:scale-[0.98] flex flex-col relative"
                    >
                      <div className="bg-slate-50 p-6 relative w-full flex items-center justify-between border-b border-slate-100">
                      <div>
                                                <h2 className="text-xl md:text-2xl font-black text-[color:var(--theme-btn)]">{barber.name}</h2>
                      </div>
                      {barber.metadata?.avatar_url ? (
                        <img src={barber.metadata.avatar_url} alt={barber.name} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center border-4 border-white shadow-sm">
                           <span className="text-xl font-black text-[color:var(--theme-btn)]">{barber.name.slice(0,2).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex items-center justify-between w-full bg-white">
                      <div className="flex items-center gap-2.5 text-slate-500">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Scissors size={14} />
                          <span>{barber.role || 'Profesional'}</span>
                        </div>
                        {(() => {
                          if (!settings.showPrices) return null;
                          const bSvcs = barber.metadata?.services as any[];
                          const bSvc = bSvcs?.find(s => s.name.trim().toLowerCase() === selectedService?.name?.toLowerCase());
                          if (bSvc?.priceDisplay === 'hidden') {
                            return (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                {settings.noPriceLabel}
                              </span>
                            );
                          }
                          if (bSvc?.price !== undefined && Number(bSvc.price) > 0) {
                            return (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {bSvc.priceDisplay === 'from' ? `Desde $${bSvc.price}` : `$${bSvc.price}`}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                       <ChevronRight size={18} className="text-[color:var(--theme-btn)] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 3: Seleccionar Fecha, Hora y Datos ===== */}
      {step === 3 && (
        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Sidebar / Top Bar */}
          <div className="bg-[color:var(--theme-btn)] px-6 py-8 lg:w-80 lg:min-h-screen lg:py-12 lg:px-8 shrink-0">
            <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-6">
              <button onClick={() => setStep(2)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <ArrowLeft size={20} />
              </button>
              {settings.logoUrl && (
                <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-sm hidden lg:flex items-center justify-center shrink-0">
                  <img 
                    src={settings.logoUrl} 
                    alt="Logo" 
                    className="max-w-full max-h-full object-contain rounded-xl"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="text-white">
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-0.5">
                  {settings.headerTitle}
                </span>
                <h2 className="text-xl lg:text-2xl font-black leading-tight">{selectedBarber?.name}</h2>
                <p className="text-xs lg:text-sm text-emerald-200 font-medium">{selectedBarber?.role || 'Profesional'}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                  <Scissors size={12} /> {selectedService?.name}
                </div>
              </div>
            </div>
            
            {/* Summary panel — visible only on desktop sidebar */}
            <div className="hidden lg:block mt-10 space-y-4">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Fecha seleccionada</p>
                <p className="text-white font-bold">{selectedDate || '—'}</p>
              </div>
              {selectedTime && (
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Hora seleccionada</p>
                  <p className="text-white font-bold">
                    {allTimes.find(t => t.value24 === selectedTime)?.label12 || selectedTime}
                  </p>
                </div>
              )}
              {settings.showPrices && selectedBarberPrice !== undefined && selectedBarberPrice > 0 && (
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Tarifa estimada</p>
                  <p className="text-white font-bold text-lg">${selectedBarberPrice}</p>
                </div>
              )}
              {settings.showPrices && (!selectedBarberPrice || selectedBarberPrice <= 0) && (
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Tarifa</p>
                  <p className="text-white/90 text-sm font-medium">{settings.noPriceLabel || 'A convenir'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10 pb-40 lg:pb-10">
              <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Dates */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <Calendar size={14} /> 1. Fecha
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {dates.map((d, i) => {
                      const isSelected = selectedDate === d.fullDate;
                      return (
                        <button
                          key={i}
                          onClick={() => { setSelectedDate(d.fullDate); setSelectedTime(null); }}
                          className={`shrink-0 w-[4.5rem] h-20 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
                            isSelected 
                              ? 'bg-[color:var(--theme-btn)] border-[color:var(--theme-btn)] text-white shadow-md scale-105' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-[color:var(--theme-btn)]/30'
                          }`}
                        >
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>{d.dayName}</span>
                          <span className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-[color:var(--theme-btn)]'}`}>{d.dayNum}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Time slots */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <Clock size={14}/> 2. Horario {isLoadingTimes && <span className="text-emerald-500 animate-pulse text-[10px]">(Cargando...)</span>}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {allTimes.map((time, i) => {
                      const isSelected = selectedTime === time.value24;
                      const isAvailable = isSlotAvailable(time.value24, slotInterval, bookedTimes);
                      
                      return (
                        <button
                          key={i}
                          disabled={!isAvailable || isLoadingTimes}
                          onClick={() => setSelectedTime(time.value24)}
                          className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                            !isAvailable 
                              ? 'bg-slate-100 border-transparent text-slate-300 cursor-not-allowed line-through'                                : isSelected 
                                  ? 'bg-[color:var(--theme-btn)] text-white shadow-md scale-105 border-[color:var(--theme-btn)]'
                                  : 'bg-white border-slate-100 text-slate-700 hover:border-[color:var(--theme-btn)]/30 shadow-sm'
                          }`}
                        >
                          {time.label12}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Customer Data */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <User size={14} /> 3. Tus Datos
                  </h3>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Tu Nombre" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-50/50 rounded-xl px-4 py-3.5 text-base font-medium text-[color:var(--theme-btn)] border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-[color:var(--theme-btn)] focus:ring-1 focus:ring-[color:var(--theme-btn)] transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="Tu Apellido" 
                        value={customerLastName}
                        onChange={(e) => setCustomerLastName(e.target.value)}
                        className="w-full bg-slate-50/50 rounded-xl px-4 py-3.5 text-base font-medium text-[color:var(--theme-btn)] border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-[color:var(--theme-bg)] focus:ring-1 focus:ring-[color:var(--theme-btn)] transition-all"
                      />
                    </div>
                    <input 
                      type="tel" 
                      placeholder="Teléfono / WhatsApp (Ej: 04141234567)" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50/50 rounded-xl px-4 py-3.5 text-base font-medium text-[color:var(--theme-btn)] border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-[color:var(--theme-btn)] focus:ring-1 focus:ring-[color:var(--theme-btn)] transition-all"
                    />
                  </div>

                </section>

                {/* Confirmation — Desktop inline */}
                <section className="hidden lg:block">
                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 text-center">
                      {errorMessage}
                    </div>
                  )}
                  {successMessage && (
                    <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-xl border border-emerald-100 text-center">
                      {successMessage} Redirigiendo a WhatsApp...
                    </div>
                  )}
                  <button
                    disabled={!selectedTime || !customerName || !customerPhone || isSubmitting || !!successMessage}
                    onClick={handleConfirm}
                    className="w-full sm:w-auto sm:min-w-[280px] bg-[#D4C3A3] hover:bg-[#c2af8e] disabled:bg-slate-200 disabled:text-slate-400 text-[color:var(--theme-btn)] disabled:opacity-70 py-4 px-8 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-sm"
                  >
                    {isSubmitting ? 'Procesando...' : !selectedTime ? 'Selecciona una hora' : (!customerName || !customerPhone) ? 'Ingresa tus datos' : 'Confirmar Reserva'}
                  </button>
                </section>
              </div>
            </div>

            {/* Sticky bottom bar — Mobile only */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
              {errorMessage && (
                <div className="mb-3 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-center">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="mb-3 p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 text-center">
                  {successMessage} Redirigiendo a WhatsApp...
                </div>
              )}
              <button
                disabled={!selectedTime || !customerName || !customerPhone || isSubmitting || !!successMessage}
                onClick={handleConfirm}
                className="w-full bg-[#D4C3A3] hover:bg-[#c2af8e] disabled:bg-slate-200 disabled:text-slate-400 text-[color:var(--theme-btn)] disabled:opacity-70 py-4 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-sm"
              >
                {isSubmitting ? 'Procesando...' : !selectedTime ? 'Selecciona una hora' : (!customerName || !customerPhone) ? 'Ingresa tus datos' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
