'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Scissors, Clock, Calendar, User, ChevronRight } from 'lucide-react';
import { processBookingAction, getBookedTimesAction } from '@/app/actions/booking';

type Tenant = { id: string, name: string, metadata?: any };
type Employee = { id: string, name: string, role: string, is_active: boolean };

const GENERATE_DATES = (openDays: number[]) => {
  const dates = [];
  const today = new Date();
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  let attempts = 0;
  
  while (dates.length < 14 && attempts < 60) {
    const d = new Date(today);
    d.setDate(today.getDate() + attempts);
    
    if (openDays.includes(d.getDay())) {
      dates.push({
        dateObj: d,
        dayName: attempts === 0 ? 'HOY' : dayNames[d.getDay()],
        dayNum: d.getDate(),
        fullDate: d.toISOString().split('T')[0]
      });
    }
    attempts++;
  }
  return dates;
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

const GENERATE_TIMES = (start: string, end: string, interval: number) => {
  const times = [];
  const startMins = parseTime(start);
  const endMins = parseTime(end);
  
  for (let m = startMins; m < endMins; m += interval) {
    times.push(formatTime(m));
  }
  return times;
};

export default function BookingClient({ tenant, employees }: { tenant: Tenant, employees: Employee[] }) {
  const settings = {
    openDays: tenant.metadata?.booking_settings?.openDays || [1, 2, 3, 4, 5, 6],
    startHour: tenant.metadata?.booking_settings?.startHour || '09:00',
    endHour: tenant.metadata?.booking_settings?.endHour || '18:00',
    intervalMinutes: tenant.metadata?.booking_settings?.intervalMinutes || 30,
    whatsappNumber: tenant.metadata?.booking_settings?.whatsappNumber || "5804245642100",
    resourceName: tenant.metadata?.booking_settings?.resourceName || 'Profesional',
    whatsappMessageTemplate: tenant.metadata?.booking_settings?.whatsappMessageTemplate || '¡Hola! Quiero confirmar mi reserva con {{profesional}} para el día {{fecha}} a las {{hora}}. Mi nombre es {{cliente}}.',
  };

  const resourceName = settings.resourceName;

  const [step, setStep] = useState(1);
  const [selectedBarber, setSelectedBarber] = useState<Employee | null>(null);
  
  const dates = GENERATE_DATES(settings.openDays);
  const allTimes = GENERATE_TIMES(settings.startHour, settings.endHour, settings.intervalMinutes);
  
  const [selectedDate, setSelectedDate] = useState(dates.length > 0 ? dates[0].fullDate : '');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function fetchTimes() {
      if (!selectedBarber || !selectedDate) return;
      setIsLoadingTimes(true);
      const result = await getBookedTimesAction(tenant.id, selectedBarber.id, selectedDate);
      if (result.success) {
        setBookedTimes(result.bookedTimes);
      }
      setIsLoadingTimes(false);
    }
    fetchTimes();
  }, [selectedBarber, selectedDate, tenant.id]);

  const handleBarberSelect = (barber: Employee) => {
    setSelectedBarber(barber);
    setStep(2);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleConfirm = async () => {
    if (!selectedTime || !customerName || !selectedBarber) return;
    
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
      });

      setIsSubmitting(false);

      if (!result?.success) {
        setErrorMessage(result?.error || 'Ocurrió un error inesperado');
        return;
      }

      setSuccessMessage('¡Reserva confirmada con éxito!');
    } catch (err: any) {
      console.error('Error Calling Server Action:', err);
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Error de red o de servidor al enviar la reserva.');
      return;
    }

    const phone = settings.whatsappNumber; 
    const template = tenant.metadata?.booking_settings?.whatsappMessageTemplate || 'Hola *{{cliente}}*, quiero confirmar la reserva con {{profesional}} para el día {{fecha}} a las {{hora}}.';
    const readableTime = allTimes.find(t => t.value24 === selectedTime)?.label12 || selectedTime;
    
    const text = template
      .replace(/{{profesional}}/g, selectedBarber.name)
      .replace(/{{fecha}}/g, selectedDate)
      .replace(/{{hora}}/g, readableTime || '')
      .replace(/{{cliente}}/g, `${customerName} ${customerLastName}`.trim());

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      
    setTimeout(() => {
      window.open(url, '_blank');
      setStep(1);
      setSelectedTime(null);
      setCustomerName('');
      setCustomerLastName('');
      setSuccessMessage('');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-800">
      
      {/* ===== STEP 1: Seleccionar Profesional ===== */}
      {step === 1 && (
        <div className="min-h-screen flex flex-col">
          {/* Hero Banner */}
          <div className="bg-[#0B3B24] px-6 py-12 md:px-12 md:py-16 lg:py-20">
            <div className="max-w-5xl mx-auto">
              <h1 className="text-white text-3xl md:text-5xl font-black mb-2 tracking-tight">{tenant.name}</h1>
              <p className="text-emerald-100/80 text-sm md:text-lg max-w-lg">
                Selecciona tu {resourceName.toLowerCase()} para agendar hoy
              </p>
            </div>
          </div>
          
          {/* Employee Cards */}
          <div className="flex-1 px-6 md:px-12 py-8 md:py-12">
            <div className="max-w-5xl mx-auto">
              {employees.length === 0 && (
                <p className="text-center text-slate-400 mt-10 text-lg">No hay opciones disponibles en este momento.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {employees.map(barber => (
                  <button
                    key={barber.id}
                    onClick={() => handleBarberSelect(barber)}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:border-[#0B3B24]/40 hover:shadow-lg text-left transition-all active:scale-[0.98] flex flex-col"
                  >
                    <div className="bg-[#eaf4ed] p-6 relative w-full">
                      <h2 className="text-xl md:text-2xl font-black text-[#0B3B24]">{barber.name}</h2>
                    </div>
                    <div className="p-4 flex items-center justify-between w-full bg-white">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Scissors size={16} />
                        <span className="text-sm font-medium">{barber.role || 'Profesional'}</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-[#0B3B24] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Seleccionar Fecha, Hora y Datos ===== */}
      {step === 2 && (
        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Sidebar / Top Bar */}
          <div className="bg-[#0B3B24] px-6 py-8 lg:w-80 lg:min-h-screen lg:py-12 lg:px-8 shrink-0">
            <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-6">
              <button onClick={() => setStep(1)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div className="text-white">
                <h2 className="text-xl lg:text-2xl font-black leading-tight">{selectedBarber?.name}</h2>
                <p className="text-xs lg:text-sm text-emerald-200 font-medium">{selectedBarber?.role || 'Profesional'}</p>
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
                              ? 'bg-[#0B3B24] border-[#0B3B24] text-white shadow-md scale-105' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-[#0B3B24]/30'
                          }`}
                        >
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>{d.dayName}</span>
                          <span className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-[#0B3B24]'}`}>{d.dayNum}</span>
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
                      const isAvailable = !bookedTimes.includes(time.value24);
                      
                      return (
                        <button
                          key={i}
                          disabled={!isAvailable || isLoadingTimes}
                          onClick={() => setSelectedTime(time.value24)}
                          className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                            !isAvailable 
                              ? 'bg-slate-100 border-transparent text-slate-300 cursor-not-allowed line-through' 
                              : isSelected 
                                ? 'bg-[#eaf4ed] border-emerald-500 text-emerald-800 shadow-sm scale-105'
                                : 'bg-white border-slate-100 text-[#0B3B24] hover:border-[#0B3B24]/30 shadow-sm'
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
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      placeholder="Tu Nombre" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50/50 rounded-xl px-4 py-3.5 text-base font-medium text-[#0B3B24] border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24] transition-all"
                    />
                    <input 
                      type="text" 
                      placeholder="Tu Apellido" 
                      value={customerLastName}
                      onChange={(e) => setCustomerLastName(e.target.value)}
                      className="w-full bg-slate-50/50 rounded-xl px-4 py-3.5 text-base font-medium text-[#0B3B24] border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24] transition-all"
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
                    disabled={!selectedTime || !customerName || isSubmitting || !!successMessage}
                    onClick={handleConfirm}
                    className="w-full sm:w-auto sm:min-w-[280px] bg-[#D4C3A3] hover:bg-[#c2af8e] disabled:bg-slate-200 disabled:text-slate-400 text-[#0B3B24] disabled:opacity-70 py-4 px-8 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-sm"
                  >
                    {isSubmitting ? 'Procesando...' : !selectedTime ? 'Selecciona una hora' : (!customerName) ? 'Ingresa tus datos' : 'Confirmar Reserva'}
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
                disabled={!selectedTime || !customerName || isSubmitting || !!successMessage}
                onClick={handleConfirm}
                className="w-full bg-[#D4C3A3] hover:bg-[#c2af8e] disabled:bg-slate-200 disabled:text-slate-400 text-[#0B3B24] disabled:opacity-70 py-4 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-sm"
              >
                {isSubmitting ? 'Procesando...' : !selectedTime ? 'Selecciona una hora' : (!customerName) ? 'Ingresa tu nombre' : 'Confirmar Reserva'}
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
