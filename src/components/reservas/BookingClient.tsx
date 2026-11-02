// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  User, 
  Users, 
  ChevronRight, 
  Briefcase, 
  Sparkles, 
  HeartPulse, 
  Baby, 
  Stethoscope, 
  Dog, 
  Scissors, 
  Tag,
  PhoneCall
} from 'lucide-react';
import { processBookingAction, getBookedTimesAction } from '@/app/actions/booking';
import { normalizeHexColor, getContrastTextColor } from '@/lib/theme/colorUtils';
import { matchesEmployeeService, detectClinicalDomain, getEmployeePrimaryDomain } from '@/lib/services/serviceMatching';

type Tenant = { id: string, name: string, metadata?: any };
type Employee = { id: string, name: string, role: string, is_active: boolean, metadata?: any };

const getDoctorScheduleSummary = (emp: Employee): string => {
  const wh = emp.metadata?.working_hours;
  if (!wh || typeof wh !== 'object' || Object.keys(wh).length === 0) {
    return 'Horarios regulares';
  }
  const dayAbbr: Record<string, string> = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mié',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sáb',
    sunday: 'Dom'
  };
  const activeDays = Object.entries(wh)
    .filter(([_, shifts]: [string, any]) => Array.isArray(shifts) && shifts.length > 0)
    .map(([day]) => dayAbbr[day] || day);
  
  if (activeDays.length === 0) return 'Sin turnos asignados';
  if (activeDays.length >= 5 && !activeDays.includes('Dom') && !activeDays.includes('Sáb')) {
    return 'Lunes a Viernes';
  }
  return `Atiende: ${activeDays.join(', ')}`;
};

const getServiceIcon = (serviceName: string, customIcon?: string) => {
  if (customIcon) {
    return <span className="text-2xl select-none leading-none">{customIcon}</span>;
  }
  const norm = (serviceName || '').toLowerCase();
  if (norm.includes('cardio') || norm.includes('corazon') || norm.includes('ecg') || norm.includes('tension')) {
    return <span className="text-2xl select-none leading-none">❤️</span>;
  }
  if (norm.includes('gineco') || norm.includes('ginelco') || norm.includes('obstetr') || norm.includes('prenatal') || norm.includes('embarazo')) {
    return <span className="text-2xl select-none leading-none">👶</span>;
  }
  if (norm.includes('odont') || norm.includes('dent') || norm.includes('bracket') || norm.includes('muela')) {
    return <span className="text-2xl select-none leading-none">🦷</span>;
  }
  if (norm.includes('oftalmo') || norm.includes('optomet') || norm.includes('ojo')) {
    return <span className="text-2xl select-none leading-none">👁️</span>;
  }
  if (norm.includes('trauma') || norm.includes('fisioterap') || norm.includes('hueso') || norm.includes('rehabilitac')) {
    return <span className="text-2xl select-none leading-none">🦴</span>;
  }
  if (norm.includes('groom') || norm.includes('canin') || norm.includes('mascot') || norm.includes('perro') || norm.includes('gato')) {
    return <span className="text-2xl select-none leading-none">🐩</span>;
  }
  if (norm.includes('barber') || norm.includes('fade') || norm.includes('barba') || norm.includes('afeitado')) {
    return <span className="text-2xl select-none leading-none">💈</span>;
  }
  if (norm.includes('estil') || norm.includes('peluqu') || norm.includes('corte') || norm.includes('belleza')) {
    return <span className="text-2xl select-none leading-none">✂️</span>;
  }
  if (norm.includes('medic') || norm.includes('doctor') || norm.includes('salud') || norm.includes('clinica') || norm.includes('consulta') || norm.includes('evaluacion')) {
    return <span className="text-2xl select-none leading-none">🩺</span>;
  }
  return <ChevronRight size={20} className="text-[color:var(--theme-btn)] group-hover:translate-x-1 transition-transform" />;
};

const SPECIALTY_META: Record<string, { icon: string; description: string; badge: string }> = {
  'Ginecología y Obstetricia': {
    icon: '👶',
    description: 'Controles prenatales, ecografías obstétricas y pélvicas, citologías, colposcopia y salud integral femenina.',
    badge: 'Salud de la Mujer',
  },
  'Odontología': {
    icon: '🦷',
    description: 'Limpiezas dentales, ortodoncia, endodoncia, restauraciones, extracciones y estética dental.',
    badge: 'Salud Bucal',
  },
  'Cardiología': {
    icon: '❤️',
    description: 'Electrocardiogramas, evaluación cardiovascular, control de tensión arterial y riesgo coronario.',
    badge: 'Cardiovascular',
  },
  'Pediatría': {
    icon: '🧸',
    description: 'Control de niño sano, esquema de vacunas, crecimiento, desarrollo y consultas pediátricas.',
    badge: 'Atención Infantil',
  },
  'Dermatología': {
    icon: '🧴',
    description: 'Diagnóstico de piel, tratamiento de acné, revisión de lunares y procedimientos dermatológicos.',
    badge: 'Cuidado Cutáneo',
  },
  'Traumatología': {
    icon: '🦴',
    description: 'Dolores articulares y musculares, fracturas, esguinces y terapia física de rehabilitación.',
    badge: 'Aparato Locomotor',
  },
  'Oftalmología': {
    icon: '👁️',
    description: 'Examen de agudeza visual, fondo de ojo, tonometría intraocular y fórmula de lentes.',
    badge: 'Salud Visual',
  },
  'Barbería': {
    icon: '💈',
    description: 'Cortes clásicos, degradados fade, perfilado de barba, afeitado con toalla caliente y estilismo.',
    badge: 'Estilismo Masculino',
  },
  'Peluquería Canina': {
    icon: '🐩',
    description: 'Baño medicado, corte a tijera, desparasitación y cuidado integral para mascotas.',
    badge: 'Cuidado Animal',
  },
  'Medicina General': {
    icon: '🩺',
    description: 'Consultas preventivas, chequeos integrales, triaje y certificados médicos de salud.',
    badge: 'Atención Primaria',
  },
};

const getSpecialtyMeta = (catName: string) => {
  if (SPECIALTY_META[catName]) return SPECIALTY_META[catName];
  const norm = (catName || '').toLowerCase();
  for (const [key, val] of Object.entries(SPECIALTY_META)) {
    if (norm.includes(key.toLowerCase()) || key.toLowerCase().includes(norm)) {
      return val;
    }
  }
  return {
    icon: '🏥',
    description: `Servicios y procedimientos de atención en ${catName}.`,
    badge: 'Especialidad',
  };
};

const resolveCategoryName = (domain: string | null, customFallback?: string): string => {
  if (domain === 'ginecologia') return 'Ginecología y Obstetricia';
  if (domain === 'odontologia') return 'Odontología';
  if (domain === 'cardiologia') return 'Cardiología';
  if (domain === 'pediatria') return 'Pediatría';
  if (domain === 'dermatologia') return 'Dermatología';
  if (domain === 'traumatologia') return 'Traumatología';
  if (domain === 'oftalmologia') return 'Oftalmología';
  if (domain === 'barberia') return 'Barbería';
  if (domain === 'grooming') return 'Peluquería Canina';
  if (domain === 'med_general') return 'Medicina General';
  if (
    customFallback && 
    customFallback !== 'Especialista' && 
    customFallback !== 'Espacio / Recurso' && 
    customFallback !== 'Profesional' &&
    customFallback !== 'Colaborador'
  ) {
    return customFallback;
  }
  return 'General';
};

const toLocalDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isSlotAvailable = (
  time24: string, 
  durationMinutes: number = 30, 
  booked: string[],
  selectedDateStr?: string
): boolean => {
  // 1. Validar que la fecha y la hora no hayan transcurrido
  if (selectedDateStr) {
    const now = new Date();
    const todayStr = toLocalDateString(now);
    if (selectedDateStr < todayStr) {
      return false; // Días del pasado bloqueados
    }
    if (selectedDateStr === todayStr) {
      const [h, m] = time24.split(':').map(Number);
      const slotMins = h * 60 + m;
      const currentMins = now.getHours() * 60 + now.getMinutes();
      // Bloquear si el horario ya pasó (con margen de cortesía de 5 min)
      if (slotMins <= currentMins + 5) {
        return false;
      }
    }
  }

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

const GENERATE_DATES = (allEmployees: Employee[], barber?: Employee | null, maxDays: number = 14, openDays: number[] = [1, 2, 3, 4, 5, 6]) => {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  const mappingDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  let attempts = 0;
  
  while (dates.length < maxDays && attempts < 90) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + attempts);
    const dayKey = mappingDays[d.getDay()];
    const dayOfWeek = d.getDay();
    
    let isWorkingDay = false;
    
    if (barber && barber.id !== 'any') {
      const wh = barber.metadata?.working_hours;
      const hasCustomSchedule = wh && typeof wh === 'object' && Object.keys(wh).length > 0;
      if (hasCustomSchedule) {
        const shifts = wh[dayKey] || [];
        isWorkingDay = shifts.length > 0;
      } else {
        // Fallback: Si el especialista no tiene turnos individuales configurados, atiende según días de apertura del negocio
        isWorkingDay = openDays.includes(dayOfWeek);
      }
    } else {
      const hasAnyEmpWithSchedule = allEmployees.some(emp => {
        const wh = emp.metadata?.working_hours;
        return wh && typeof wh === 'object' && Object.keys(wh).length > 0;
      });

      if (hasAnyEmpWithSchedule) {
        isWorkingDay = allEmployees.some(emp => {
          if (!emp.is_active) return false;
          const wh = emp.metadata?.working_hours;
          if (wh && typeof wh === 'object' && Object.keys(wh).length > 0) {
            const shifts = wh[dayKey] || [];
            return shifts.length > 0;
          }
          return openDays.includes(dayOfWeek);
        });
      } else {
        isWorkingDay = openDays.includes(dayOfWeek);
      }
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
  shifts?: {start: string, end: string}[],
  hasCustomSchedule: boolean = false
) => {
  // Guardia defensiva: intervalo mínimo de 5 minutos para prevenir bucles infinitos (DoS en navegador)
  const safeInterval = Math.max(5, Number(interval) || 30);
  const times = [];
  
  if (shifts && shifts.length > 0) {
    for (const shift of shifts) {
      if (!shift?.start || !shift?.end) continue;
      const startMins = parseTime(shift.start);
      const endMins = parseTime(shift.end);
      // Blindaje: El turno debe terminar antes o exactamente al finalizar la jornada del médico
      for (let m = startMins; m + safeInterval <= endMins; m += safeInterval) {
        times.push(formatTime(m));
      }
    }
  } else if (!hasCustomSchedule) {
    // Si el especialista tiene agenda configurada pero no atiende este día, times queda vacío []
    // Solo se recurre al horario general si el profesional no tiene horario configurado
    const startMins = parseTime(globalStart);
    const endMins = parseTime(globalEnd);
    for (let m = startMins; m + safeInterval <= endMins; m += safeInterval) {
      times.push(formatTime(m));
    }
  }
  
  return times;
};

export default function BookingClient({ 
  tenant, 
  employees, 
  catalogServices = [],
  theme 
}: { 
  tenant: Tenant; 
  employees: Employee[]; 
  catalogServices?: any[];
  theme?: { bgColor: string; btnColor: string };
}) {
  // Theme handling con protección total anti-invisibilidad y contraste WCAG
  const defaultTheme = { bgColor: "#f8fafc", btnColor: "#0B3B24" };
  const appliedBg = normalizeHexColor(theme?.bgColor, defaultTheme.bgColor);
  const appliedBtn = normalizeHexColor(theme?.btnColor, defaultTheme.btnColor);
  const btnTextColor = getContrastTextColor(appliedBtn);
  const bgTextColor = getContrastTextColor(appliedBg);

  const rootStyle = {
    "--theme-bg": appliedBg,
    "--theme-bg-text": bgTextColor,
    "--theme-btn": appliedBtn,
    "--theme-btn-text": btnTextColor,
    backgroundColor: appliedBg,
  } as React.CSSProperties;

  const rawConfiguredPhone = tenant.metadata?.booking_settings?.whatsappNumber 
    || (tenant.metadata as any)?.phone 
    || (tenant as any)?.phone 
    || '';

  const hasCourts = Boolean(
    tenant?.metadata?.sports_courts && 
    Array.isArray(tenant.metadata.sports_courts) && 
    tenant.metadata.sports_courts.length > 0
  );

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
  const [selectedService, setSelectedService] = useState<{name: string, durationMinutes: number, priceText?: string, basePrice?: number, isCustomPrice?: boolean, icon?: string, category?: string} | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Employee | null>(null);
  const [selectedBarberPrice, setSelectedBarberPrice] = useState<number | undefined>(undefined);

  // Mapa de puestos configurados en la empresa con sus íconos elegidos
  const configuredRolesMap = useMemo(() => {
    const map = new Map<string, string>();
    const rawRoles = (tenant?.metadata as any)?.company_roles;
    if (Array.isArray(rawRoles)) {
      rawRoles.forEach((item: any) => {
        if (!item) return;
        if (typeof item === 'string') {
          const trimmed = item.trim();
          const emojiMatch = trimmed.match(/^(\p{Extended_Pictographic}+)\s*(.+)$/u);
          if (emojiMatch) {
            map.set(emojiMatch[2].trim().toLowerCase(), emojiMatch[1]);
          }
        } else if (typeof item === 'object' && item.name) {
          if (item.icon) {
            map.set(item.name.trim().toLowerCase(), item.icon);
          }
        }
      });
    }
    return map;
  }, [tenant?.metadata]);

  // Extract unique services from catalog and employees (Memoized)
  const uniqueServices = useMemo(() => {
    interface ServiceAgg {
      name: string;
      durationMinutes: number;
      prices: number[];
      hasFrom: boolean;
      hasHidden: boolean;
      basePrice?: number;
      category: string;
    }
    const allServices = new Map<string, ServiceAgg>();
    
    // 0. Servicios registrados formalmente en el Catálogo de Servicios del ERP (tabla items)
    if (Array.isArray(catalogServices) && catalogServices.length > 0) {
      catalogServices.forEach(item => {
        if (!item?.name || !item.name.trim()) return;
        const key = item.name.trim().toLowerCase();
        const detectedDomain = detectClinicalDomain(item.name) || detectClinicalDomain(item.category);
        const cat = resolveCategoryName(detectedDomain, item.category || 'Servicios Clínicos');
        const dur = Number(item.metadata?.duration_minutes || item.metadata?.durationMinutes) || 45;
        const price = Number(item.base_price) || 0;

        if (!allServices.has(key)) {
          allServices.set(key, {
            name: item.name.trim(),
            durationMinutes: dur,
            prices: price > 0 ? [price] : [],
            hasFrom: false,
            hasHidden: false,
            basePrice: price > 0 ? price : undefined,
            category: cat,
          });
        }
      });
    }

    employees.forEach(emp => {
      if (emp.is_active === false) return;
      const empDomain = getEmployeePrimaryDomain(emp);
      const empRole = (emp.metadata?.role_title || emp.role || '').trim();
      const svcs = emp.metadata?.services as any[];
      const defaultSlot = Number(emp.metadata?.default_slot_minutes || emp.metadata?.general_slot_minutes || 60);
      const isGeneralEnabled = emp.metadata?.general_service_enabled !== false;
      const generalPrice = emp.metadata?.general_service_price !== undefined ? Number(emp.metadata?.general_service_price) : undefined;

      // 1. Servicios Particulares o Especializados creados por el negocio en "Funciones y Servicios"
      if (svcs && svcs.length > 0) {
        svcs.forEach(s => {
          if (!s.name || !s.name.trim()) return;
          const key = s.name.trim().toLowerCase();
          const detectedDomain = detectClinicalDomain(s.name) || empDomain;
          const cat = resolveCategoryName(detectedDomain, empRole);

          if (!allServices.has(key)) {
            allServices.set(key, {
              name: s.name.trim(),
              durationMinutes: Number(s.durationMinutes) || defaultSlot,
              prices: [],
              hasFrom: false,
              hasHidden: false,
              basePrice: s.price !== undefined && Number(s.price) > 0 ? Number(s.price) : undefined,
              category: cat,
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
      }

      // 2. Rama / Especialidad o Servicio General del Colaborador
      if (isGeneralEnabled) {
        const customGeneralName = emp.metadata?.general_service_name?.trim();
        const roleTitle = (emp.metadata?.role_title || emp.role || '').trim();
        const docRole = (emp.metadata?.doctor_config?.role || emp.metadata?.doctor_config?.specialty || emp.metadata?.specialty || emp.metadata?.cargo || '').trim();
        const dentistRole = (emp.metadata?.dentist_config?.role || '').trim();
        const barberRole = (emp.metadata?.barber_config?.role || '').trim();
        const groomerRole = (emp.metadata?.groomer_config?.role || '').trim();

        // Determinar el nombre de la rama oficial
        let branchName = '';
        if (customGeneralName) {
          branchName = customGeneralName;
        } else if (docRole) {
          branchName = docRole.toLowerCase().startsWith('consulta') ? docRole : `Consulta: ${docRole}`;
        } else if (
          roleTitle && 
          roleTitle !== 'Espacio / Recurso' && 
          roleTitle !== 'Especialista' &&
          roleTitle !== 'Profesional' &&
          roleTitle !== 'Colaborador' &&
          roleTitle !== 'employee'
        ) {
          branchName = roleTitle.toLowerCase().startsWith('consulta') ? roleTitle : `Consulta: ${roleTitle}`;
        } else if (dentistRole) {
          branchName = dentistRole;
        } else if (barberRole) {
          branchName = barberRole;
        } else if (groomerRole) {
          branchName = groomerRole;
        } else if (emp.name.toLowerCase().includes('dr.') || emp.name.toLowerCase().includes('dra.')) {
          const docDomain = empDomain ? resolveCategoryName(empDomain) : 'Medicina General';
          branchName = `Consulta Médica (${docDomain})`;
        } else if ((!svcs || svcs.length === 0) && (empDomain || emp.metadata?.is_doctor || emp.metadata?.doctor_config)) {
          branchName = 'Atención General';
        }

        if (branchName) {
          const key = branchName.toLowerCase();
          const detectedBranch = detectClinicalDomain(branchName) || empDomain;
          const cat = resolveCategoryName(detectedBranch, empRole);

          if (!allServices.has(key)) {
            allServices.set(key, {
              name: branchName,
              durationMinutes: defaultSlot,
              prices: [],
              hasFrom: false,
              hasHidden: false,
              basePrice: generalPrice && generalPrice > 0 ? generalPrice : undefined,
              category: cat,
            });
          }
          const entry = allServices.get(key)!;
          if (generalPrice && generalPrice > 0) {
            entry.prices.push(generalPrice);
            if (!entry.basePrice) entry.basePrice = generalPrice;
          }
        }
      }
    });

    // 3. Fallback Infalible: Si aún no hay servicios, pero hay especialistas/doctores en la empresa
    if (allServices.size === 0 && employees.length > 0) {
      allServices.set('consulta_general', {
        name: 'Consulta / Evaluación Médica',
        durationMinutes: 45,
        prices: [],
        hasFrom: false,
        hasHidden: false,
        category: 'Medicina General',
      });
    }

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

      const nameLower = s.name.trim().toLowerCase();
      let icon = configuredRolesMap.get(nameLower);
      if (!icon) {
        const emojiMatch = s.name.trim().match(/^(\p{Extended_Pictographic}+)\s*(.+)$/u);
        if (emojiMatch) {
          icon = emojiMatch[1];
        }
      }

      return {
        name: s.name,
        durationMinutes: s.durationMinutes,
        basePrice: s.basePrice,
        priceText: priceText,
        isCustomPrice: s.hasHidden || s.prices.length === 0,
        icon,
        category: s.category || 'General',
      };
    });
  }, [employees, catalogServices, settings.showPrices, settings.noPriceLabel, configuredRolesMap]);

  // Personal / Doctores activos disponibles para reservas
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => emp.is_active !== false);
  }, [employees]);
  
  const dates = useMemo(() => {
    return GENERATE_DATES(activeEmployees, selectedBarber, settings.maxDaysInAdvance, settings.openDays);
  }, [activeEmployees, selectedBarber, settings.maxDaysInAdvance, settings.openDays]);
  
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
  const hasDoctorCustomSchedule = Boolean(
    selectedBarber &&
    selectedBarber.id !== 'any' &&
    selectedBarber.metadata?.working_hours &&
    typeof selectedBarber.metadata.working_hours === 'object' &&
    Object.keys(selectedBarber.metadata.working_hours).length > 0
  );

  const slotInterval = selectedService?.durationMinutes || settings.intervalMinutes;
  
  const allTimes = useMemo(() => {
    return GENERATE_TIMES(
      settings.startHour, 
      settings.endHour, 
      slotInterval,
      shifts,
      hasDoctorCustomSchedule
    );
  }, [settings.startHour, settings.endHour, slotInterval, shifts, hasDoctorCustomSchedule]);
  
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [groupSlots, setGroupSlots] = useState<Record<string, { spotsTaken: number; maxCapacity: number; remainingSpots: number }>>({});
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  
  const [customerFullName, setCustomerFullName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Auto-completar datos guardados del cliente para evitar que los vuelva a escribir
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFull = localStorage.getItem('rendo_client_fullname');
      const savedFirst = localStorage.getItem('rendo_client_firstname');
      const savedLast = localStorage.getItem('rendo_client_lastname');
      const savedPhone = localStorage.getItem('rendo_client_phone');
      if (savedFull) {
        setCustomerFullName(savedFull);
      } else if (savedFirst || savedLast) {
        setCustomerFullName([savedFirst, savedLast].filter(Boolean).join(' '));
      }
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
        setGroupSlots((result as any).groupSlots || {});
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

  // Procedimientos o servicios disponibles específicamente para el doctor seleccionado
  const doctorAvailableServices = useMemo(() => {
    if (!selectedBarber || selectedBarber.id === 'any') return uniqueServices;
    
    const bSvcs = Array.isArray(selectedBarber.metadata?.services) ? (selectedBarber.metadata.services as any[]) : [];
    if (bSvcs.length > 0) {
      return bSvcs.map(s => {
        const p = Number(s.price) || 0;
        return {
          name: s.name,
          durationMinutes: Number(s.duration || s.durationMinutes) || 45,
          basePrice: p > 0 ? p : undefined,
          priceText: p > 0 ? `$${p}` : settings.noPriceLabel,
          isCustomPrice: p <= 0,
          category: selectedBarber.metadata?.specialty || 'Servicio',
        };
      });
    }

    const compatible = uniqueServices.filter(s => matchesEmployeeService(selectedBarber, s.name));
    if (compatible.length > 0) return compatible;

    const spec = selectedBarber.metadata?.specialty || (selectedBarber.role && selectedBarber.role !== 'employee' && selectedBarber.role !== 'Colaborador' ? selectedBarber.role : null);
    const svcName = spec ? (spec.toLowerCase().startsWith('consulta') ? spec : `Consulta: ${spec}`) : 'Consulta Médica';
    const genPrice = selectedBarber.metadata?.general_service_price ? Number(selectedBarber.metadata.general_service_price) : undefined;
    return [{
      name: svcName,
      durationMinutes: 45,
      basePrice: genPrice && genPrice > 0 ? genPrice : undefined,
      priceText: genPrice && genPrice > 0 ? `$${genPrice}` : settings.noPriceLabel,
      isCustomPrice: !genPrice || genPrice <= 0,
      category: spec || 'Medicina General',
    }];
  }, [selectedBarber, uniqueServices, settings.noPriceLabel]);

  const handleServiceSelect = (service: { name: string, durationMinutes: number, priceText?: string, basePrice?: number, isCustomPrice?: boolean }) => {
    setSelectedService(service);
    setStep(2);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleBarberSelect = (barber: Employee) => {
    setSelectedBarber(barber);

    // 1. Encontrar o construir el servicio por defecto para este especialista
    const bSvcs = Array.isArray(barber.metadata?.services) ? (barber.metadata.services as any[]) : [];
    let chosenSvc: any = null;

    if (bSvcs.length > 0) {
      const first = bSvcs[0];
      const p = Number(first.price) || 0;
      chosenSvc = {
        name: first.name || 'Consulta Médica',
        durationMinutes: Number(first.duration || first.durationMinutes) || 45,
        basePrice: p > 0 ? p : undefined,
        priceText: p > 0 ? `$${p}` : settings.noPriceLabel,
        isCustomPrice: p <= 0,
        category: barber.metadata?.specialty || 'Servicio',
      };
      setSelectedBarberPrice(p > 0 ? p : undefined);
    } else {
      const compatible = uniqueServices.find(s => matchesEmployeeService(barber, s.name));
      if (compatible) {
        chosenSvc = compatible;
        setSelectedBarberPrice(compatible.basePrice);
      } else {
        const spec = barber.metadata?.specialty || (barber.role && barber.role !== 'employee' && barber.role !== 'Colaborador' ? barber.role : null);
        const svcName = spec ? (spec.toLowerCase().startsWith('consulta') ? spec : `Consulta: ${spec}`) : 'Consulta Médica';
        const genPrice = barber.metadata?.general_service_price ? Number(barber.metadata.general_service_price) : undefined;
        chosenSvc = {
          name: svcName,
          durationMinutes: 45,
          basePrice: genPrice && genPrice > 0 ? genPrice : undefined,
          priceText: genPrice && genPrice > 0 ? `$${genPrice}` : settings.noPriceLabel,
          isCustomPrice: !genPrice || genPrice <= 0,
          category: spec || 'Medicina General',
        };
        setSelectedBarberPrice(genPrice && genPrice > 0 ? genPrice : undefined);
      }
    }

    setSelectedService(chosenSvc);
    setStep(3);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleConfirm = async () => {
    const trimmedFull = customerFullName.trim();
    if (!selectedTime || !trimmedFull || !customerPhone || !selectedBarber) {
      setErrorMessage('Por favor, completa todos los campos (Nombre completo y Teléfono).');
      return;
    }
    
    // Separar en Nombre y Apellido de forma limpia para persistencia
    const parts = trimmedFull.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Verificación atómica previa en tiempo real contra colisiones
      const preCheck = await getBookedTimesAction(tenant.id, selectedBarber.id, selectedDate, clientTzOffset);
      if (preCheck.success && Array.isArray(preCheck.bookedTimes) && preCheck.bookedTimes.includes(selectedTime)) {
        setIsSubmitting(false);
        setBookedTimes(preCheck.bookedTimes);
        setErrorMessage('Lo sentimos, este turno acaba de ser reservado por otro paciente. Por favor selecciona otro horario.');
        return;
      }

      const svcNameLower = (selectedService?.name || '').toLowerCase();
      const isSportsSvc = svcNameLower.includes('padel') || svcNameLower.includes('pádel') || svcNameLower.includes('tenis') || hasCourts;
      const isGroupSvc = Boolean(
        (isSportsSvc && (svcNameLower.includes('grupal') || svcNameLower.includes('grupo'))) ||
        (selectedTime && groupSlots[selectedTime] && Number(groupSlots[selectedTime].maxCapacity || 0) > 1)
      );
      const slotMaxCapacity = (selectedTime && groupSlots[selectedTime]?.maxCapacity) || (isGroupSvc ? 4 : 1);

      const result = await processBookingAction({
        tenantId: tenant.id,
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        date: selectedDate,
        time: selectedTime,
        firstName: firstName,
        lastName: lastName,
        phone: customerPhone,
        durationMinutes: selectedService?.durationMinutes || 60,
        timezoneOffset: clientTzOffset,
        price: selectedBarberPrice || selectedService?.basePrice || 0,
        serviceName: selectedService?.name,
        isGroupClass: isGroupSvc,
        maxCapacity: slotMaxCapacity,
      });

      setIsSubmitting(false);

      if (!result?.success) {
        setErrorMessage(result?.error || 'Ocurrió un error inesperado');
        return;
      }

      // Guardar datos en localStorage para que el cliente no tenga que escribirlos en futuras reservas
      if (typeof window !== 'undefined') {
        localStorage.setItem('rendo_client_fullname', trimmedFull);
        localStorage.setItem('rendo_client_firstname', firstName);
        localStorage.setItem('rendo_client_lastname', lastName);
        localStorage.setItem('rendo_client_phone', customerPhone);
      }

      const confirmationMsg = (result as any).isGroupJoin 
        ? ((result as any).message || `¡Cupo reservado con éxito! (Cupo ${(result as any).spotNumber || 1} de ${(result as any).maxCapacity || 4})`)
        : '¡Reserva confirmada con éxito!';
      setSuccessMessage(confirmationMsg);
      
      // WhatsApp Redirection: Enrutamiento Inteligente (Al empleado o a Central de Recepción)
      const routingMode = tenant.metadata?.booking_settings?.whatsappRoutingMode || 'employee_first';
      
      const assignedEmp = result.assignedBarberId 
        ? employees.find(e => e.id === result.assignedBarberId) 
        : (selectedBarber && selectedBarber.id !== 'any' ? selectedBarber : null);

      const employeePhone = assignedEmp?.metadata?.whatsapp 
        || assignedEmp?.metadata?.phone 
        || assignedEmp?.metadata?.cellphone 
        || '';

      let targetPhone = settings.whatsappNumber;
      if (routingMode === 'employee_first' && employeePhone && assignedEmp?.metadata?.bookable_whatsapp !== false) {
        targetPhone = employeePhone;
      }

      const cleanPhone = normalizeWhatsAppPhone(targetPhone);
      const template = tenant.metadata?.booking_settings?.whatsappMessageTemplate || settings.whatsappMessageTemplate;
      const readableTime = allTimes.find(t => t.value24 === selectedTime)?.label12 || selectedTime;
      const assignedName = result.assignedBarberName || selectedBarber.name; // Usar el asignado si era 'cualquiera'
      
      const text = template
        .replace(/{{profesional}}/g, assignedName)
        .replace(/{{fecha}}/g, selectedDate)
        .replace(/{{hora}}/g, readableTime || '')
        .replace(/{{cliente}}/g, customerFullName.trim())
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
    <div className="min-h-screen font-sans text-slate-800 transition-colors" style={rootStyle}>
      
            {/* ===== STEP 1: Seleccionar Médico / Especialista Directamente ===== */}
      {(step === 1 || step === 2) && (
        <div className="min-h-screen flex flex-col">
          {/* Hero Banner */}
          <div
            className="px-6 py-10 md:px-12 md:py-14 lg:py-16 transition-colors shadow-xs"
            style={{ backgroundColor: appliedBtn, color: btnTextColor }}
          >
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
                <span className="text-[11px] font-bold uppercase tracking-widest block mb-1 opacity-80" style={{ color: btnTextColor }}>
                  {settings.headerTitle}
                </span>
                <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight" style={{ color: btnTextColor }}>
                  Elige tu Especialista
                </h1>
                <p className="text-sm md:text-base max-w-xl font-medium leading-relaxed opacity-90" style={{ color: btnTextColor }}>
                  Selecciona con quién deseas agendar tu cita para ver sus días y horarios de atención:
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area: Directorio Directo de Especialistas */}
          <div className="flex-1 px-6 md:px-12 py-8 md:py-12">
            <div className="max-w-5xl mx-auto">
              {activeEmployees.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No hay especialistas registrados en este momento</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Por favor comunícate directamente con la recepción para coordinar tu cita.
                  </p>
                  {settings.whatsappNumber && (
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <PhoneCall size={16} />
                      Contactar por WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeEmployees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        handleBarberSelect({ id: 'any', name: 'Cualquier Profesional', role: 'El que esté libre', is_active: true });
                      }}
                      className="group bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-xs border border-slate-700 hover:shadow-xl text-left transition-all active:scale-[0.98] flex flex-col relative"
                    >
                      <div className="p-6 relative w-full flex flex-col sm:flex-row items-center gap-5 border-b border-slate-700/60">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-700/70 text-slate-200 flex items-center justify-center border-4 border-slate-800 shadow-md group-hover:scale-105 transition-transform shrink-0">
                          <Users className="text-slate-300 w-12 h-12" />
                        </div>
                        <div className="text-center sm:text-left flex-1 min-w-0">
                          <span className="inline-block text-[11px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full mb-1.5 border border-indigo-500/20">
                            Sin preferencia
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-indigo-200 transition-colors">
                            Cualquiera disponible
                          </h2>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Asignación automática según disponibilidad
                          </p>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between w-full bg-slate-800/50 mt-auto">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock size={16} />
                          <span className="text-xs font-semibold">Horarios más flexibles</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-black text-indigo-300 group-hover:translate-x-1 transition-transform">
                          <span>Ver Horarios</span>
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </button>
                  )}

                  {activeEmployees.map(barber => {
                    const empRoleTitle = (barber.metadata?.role_title || barber.metadata?.doctor_config?.specialty || barber.metadata?.specialty || barber.role || 'Especialista').trim();
                    const empRoleIcon = configuredRolesMap.get(empRoleTitle.toLowerCase());
                    const scheduleHint = getDoctorScheduleSummary(barber);

                    return (
                      <button
                        key={barber.id}
                        type="button"
                        onClick={() => handleBarberSelect(barber)}
                        className="group bg-white rounded-3xl overflow-hidden shadow-xs border border-slate-200 hover:border-slate-400 hover:shadow-xl text-left transition-all active:scale-[0.98] flex flex-col relative"
                      >
                        <div className="bg-gradient-to-b from-slate-50 to-white p-6 relative w-full flex flex-col sm:flex-row items-center gap-5 border-b border-slate-100">
                          {barber.metadata?.avatar_url ? (
                            <div className="relative shrink-0">
                              <img
                                src={barber.metadata.avatar_url}
                                alt={barber.name}
                                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Disponible" />
                            </div>
                          ) : (
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-indigo-50 text-[color:var(--theme-btn)] flex items-center justify-center font-black text-2xl border-4 border-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                              {barber.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="text-center sm:text-left flex-1 min-w-0">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[color:var(--theme-btn)] bg-slate-100 px-2.5 py-0.5 rounded-full mb-1.5">
                              {empRoleIcon && <span className="select-none">{empRoleIcon}</span>}
                              <span>{empRoleTitle}</span>
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-[color:var(--theme-btn)] transition-colors truncate">
                              {barber.name}
                            </h2>
                            {barber.metadata?.specialty && barber.metadata.specialty !== empRoleTitle && (
                              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                                {barber.metadata.specialty}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="p-4 flex items-center justify-between w-full bg-slate-50/60 mt-auto">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Calendar size={14} className="text-slate-400" />
                            <span>{scheduleHint}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-black text-[color:var(--theme-btn)] group-hover:translate-x-1 transition-transform">
                            <span>Ver Horarios</span>
                            <ChevronRight size={18} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
{/* ===== STEP 3: Seleccionar Fecha, Hora y Datos ===== */}
      {step === 3 && (
        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Sidebar / Top Bar */}
          <div 
            className="px-6 py-8 lg:w-80 lg:min-h-screen lg:py-12 lg:px-8 shrink-0 transition-colors shadow-sm"
            style={{ backgroundColor: appliedBtn, color: btnTextColor }}
          >
            <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-6">
              <button 
                onClick={() => setStep(1)} title="Volver a los profesionales" 
                className="p-2.5 rounded-full transition-colors border border-white/20"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: btnTextColor }}
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="flex items-center gap-4 w-full">
                {selectedBarber?.metadata?.avatar_url ? (
                  <img 
                    src={selectedBarber.metadata.avatar_url} 
                    alt={selectedBarber.name} 
                    className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md shrink-0" 
                  />
                ) : (
                  <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl border-2 border-white/30 shadow-md shrink-0" style={{ color: btnTextColor }}>
                    {selectedBarber?.name ? selectedBarber.name.slice(0, 2).toUpperCase() : <Users size={24} />}
                  </div>
                )}
                <div className="min-w-0 flex-1" style={{ color: btnTextColor }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 opacity-80">
                    {settings.headerTitle}
                  </span>
                  <h2 className="text-xl lg:text-2xl font-black leading-tight truncate">{selectedBarber?.name}</h2>
                  {(() => {
                    const empRoleTitle = (selectedBarber?.metadata?.role_title || selectedBarber?.role || 'Profesional').trim();
                    const empRoleIcon = configuredRolesMap.get(empRoleTitle.toLowerCase());
                    return (
                      <p className="text-xs lg:text-sm font-medium truncate opacity-85 flex items-center gap-1.5">
                        {empRoleIcon && <span className="select-none">{empRoleIcon}</span>}
                        <span>{selectedBarber?.role || 'Profesional'}</span>
                      </p>
                    );
                  })()}
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-black/15 dark:bg-white/15 px-3 py-1 rounded-full text-xs font-bold">
                    {selectedService?.icon ? <span className="select-none">{selectedService.icon}</span> : <Sparkles size={12} />} 
                    <span>{selectedService?.name}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Summary panel — visible only on desktop sidebar */}
            <div className="hidden lg:block mt-10 space-y-4">
              <div className="bg-black/10 dark:bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-75">Fecha seleccionada</p>
                <p className="font-bold">{selectedDate || '—'}</p>
              </div>
              {selectedTime && (
                <div className="bg-black/10 dark:bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-75">Hora seleccionada</p>
                  <p className="font-bold">
                    {allTimes.find(t => t.value24 === selectedTime)?.label12 || selectedTime}
                  </p>
                </div>
              )}
              {settings.showPrices && selectedBarberPrice !== undefined && selectedBarberPrice > 0 && (
                <div className="bg-black/10 dark:bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-75">Tarifa estimada</p>
                  <p className="font-bold text-lg">${selectedBarberPrice}</p>
                </div>
              )}
              {settings.showPrices && (!selectedBarberPrice || selectedBarberPrice <= 0) && (
                <div className="bg-black/10 dark:bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-75">Tarifa</p>
                  <p className="text-sm font-medium opacity-90">{settings.noPriceLabel || 'A convenir'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10 pb-40 lg:pb-10">
              <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Selector de Procedimiento o Servicio si el especialista ofrece más de uno */}
                {doctorAvailableServices.length > 1 && (
                  <section>
                    <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3 flex items-center gap-2">
                      <Sparkles size={14} /> Procedimiento / Servicio
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {doctorAvailableServices.map((svc, idx) => {
                        const isSelected = selectedService?.name?.toLowerCase() === svc.name?.toLowerCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedService(svc);
                              setSelectedBarberPrice(svc.basePrice);
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                              isSelected
                                ? 'shadow-sm scale-[1.02]'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                            style={isSelected ? { backgroundColor: appliedBtn, borderColor: appliedBtn, color: btnTextColor } : {}}
                          >
                            <span>{svc.name}</span>
                            {settings.showPrices && svc.priceText && (
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                              >
                                {svc.priceText}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

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
                              ? 'shadow-md scale-105' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                          }`}
                          style={isSelected ? { backgroundColor: appliedBtn, borderColor: appliedBtn, color: btnTextColor } : {}}
                        >
                          <span className={`text-[10px] font-bold ${isSelected ? 'opacity-90' : 'text-slate-400'}`} style={isSelected ? { color: btnTextColor } : {}}>{d.dayName}</span>
                          <span className="text-2xl font-black" style={isSelected ? { color: btnTextColor } : { color: appliedBtn }}>{d.dayNum}</span>
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
                      const isAvailable = isSlotAvailable(time.value24, slotInterval, bookedTimes, selectedDate);
                      const groupSlot = groupSlots[time.value24];
                      
                      return (
                        <button
                          key={i}
                          disabled={!isAvailable || isLoadingTimes}
                          onClick={() => setSelectedTime(time.value24)}
                          className={`py-2.5 sm:py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center justify-center ${
                            !isAvailable 
                              ? 'bg-slate-100 border-transparent text-slate-300 cursor-not-allowed line-through' 
                              : isSelected 
                                ? 'shadow-md scale-105'
                                : 'bg-white border-slate-100 text-slate-700 hover:border-slate-300 shadow-sm'
                          }`}
                          style={isSelected ? { backgroundColor: appliedBtn, borderColor: appliedBtn, color: btnTextColor } : {}}
                        >
                          <span>{time.label12}</span>
                          {groupSlot && Number(groupSlot.maxCapacity || 0) > 1 && groupSlot.remainingSpots > 0 && (
                            <span className={`text-[9px] font-black uppercase mt-0.5 tracking-tighter ${isSelected ? 'opacity-90 text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {(hasCourts || (selectedService?.name?.toLowerCase().includes('padel') || selectedService?.name?.toLowerCase().includes('tenis'))) ? '🎾 ' : '👥 '}
                              {groupSlot.remainingSpots} cupo{groupSlot.remainingSpots > 1 ? 's' : ''}
                            </span>
                          )}
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
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Nombre y Apellido *
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej: María Gómez" 
                        value={customerFullName}
                        onChange={(e) => setCustomerFullName(e.target.value)}
                        className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-base font-semibold text-slate-900 border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-300 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Teléfono / WhatsApp *
                      </label>
                      <input 
                        type="tel" 
                        required
                        placeholder="Ej: 04141234567 o +584141234567" 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-base font-semibold text-slate-900 border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-300 transition-all"
                      />
                    </div>
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
                    disabled={!selectedTime || !customerFullName || !customerPhone || isSubmitting || !!successMessage}
                    onClick={handleConfirm}
                    className="w-full sm:w-auto sm:min-w-[280px] disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-70 py-4 px-8 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    style={selectedTime && customerFullName && customerPhone ? { backgroundColor: appliedBtn, color: btnTextColor } : {}}
                  >
                    {isSubmitting ? 'Procesando...' : !selectedTime ? 'Selecciona una hora' : (!customerFullName || !customerPhone) ? 'Ingresa tus datos' : 'Confirmar Reserva'}
                  </button>
                </section>
              </div>
            </div>

            {/* Sticky bottom bar — Mobile only */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-20">
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
                disabled={!selectedTime || !customerFullName || !customerPhone || isSubmitting || !!successMessage}
                onClick={handleConfirm}
                className="w-full disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-70 py-4 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-md active:scale-[0.99]"
                style={selectedTime && customerFullName && customerPhone ? { backgroundColor: appliedBtn, color: btnTextColor } : {}}
              >
                {isSubmitting ? 'Procesando...' : !selectedTime ? 'Selecciona una hora' : (!customerFullName || !customerPhone) ? 'Ingresa tus datos' : 'Confirmar Reserva'}
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
