'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Scissors, Clock } from 'lucide-react';
import { processBookingAction, getBookedTimesAction } from '@/app/actions/booking';

type Tenant = { id: string, name: string, metadata?: any };
type Employee = { id: string, name: string, role: string, is_active: boolean };

const GENERATE_DATES = (openDays: number[]) => {
  const dates = [];
  const today = new Date();
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  let i = 0;
  let attempts = 0; // Para evitar bucles infinitos
  
  // Genera los próximos 14 días laborables
  while (dates.length < 14 && attempts < 60) {
    const d = new Date(today);
    d.setDate(today.getDate() + attempts);
    
    // Si el día está dentro de los permitidos por el dueño
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

// Convierte 'HH:mm' a minutos
const parseTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Convierte minutos a 'HH:mm' y formato AM/PM
const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hr24 = h.toString().padStart(2, '0');
  const min = m.toString().padStart(2, '0');
  
  // Formato 12 horas AM/PM
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  
  return {
    value24: `${hr24}:${min}`, // Para la BD
    label12: `${h12}:${min} ${ampm}` // Para mostrar al usuario
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
  // Read settings from tenant or use defaults
  const settings = tenant.metadata?.booking_settings || {
    openDays: [1, 2, 3, 4, 5, 6],
    startHour: '09:00',
    endHour: '18:00',
    intervalMinutes: 30
  };

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

  // Cuando cambia la fecha o el barbero, buscar los horarios ocupados
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
    if (!selectedTime || !customerName || !customerLastName || !selectedBarber) return;
    
    setIsSubmitting(true);
    setErrorMessage('');

    const result = await processBookingAction({
      tenantId: tenant.id,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name,
      date: selectedDate,
      time: selectedTime, // this is value24
      firstName: customerName,
      lastName: customerLastName,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Ocurrió un error inesperado');
      return;
    }

    setSuccessMessage('¡Reserva confirmada con éxito!');

    const phone = "5804245642100"; 
    // Find the readable time to send to WhatsApp
    const readableTime = allTimes.find(t => t.value24 === selectedTime)?.label12 || selectedTime;
    const text = `¡Hola! Acabo de hacer una reserva web con ${selectedBarber.name} para el día ${selectedDate} a las ${readableTime}. Mi nombre es ${customerName} ${customerLastName}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
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
    <div className="min-h-screen bg-[#F9F6F0] md:bg-slate-200 flex justify-center items-center font-sans text-slate-800 md:p-8">
      <div className="w-full h-full md:h-[850px] max-w-md bg-[#F9F6F0] relative shadow-2xl flex flex-col md:rounded-[2.5rem] overflow-hidden border border-slate-200/50">
        
        {step === 1 && (
          <div className="flex flex-col h-full">
            <div className="bg-[#0B3B24] pt-12 pb-8 px-6 shadow-md z-10 md:pt-16">
              <h1 className="text-white text-3xl font-black mb-1">{tenant.name}</h1>
              <p className="text-emerald-100/80 text-sm">Selecciona con quién quieres agendar hoy</p>
            </div>
            
            <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-white/50">
              {employees.length === 0 && (
                 <p className="text-center text-slate-400 mt-10">No hay profesionales disponibles.</p>
              )}
              {employees.map(barber => (
                <button
                  key={barber.id}
                  onClick={() => handleBarberSelect(barber)}
                  className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:border-[#0B3B24]/30 hover:shadow-md text-left transition-all active:scale-95 flex flex-col"
                >
                  <div className="bg-[#eaf4ed] p-5 relative w-full">
                    <h2 className="text-2xl font-black text-[#0B3B24]">{barber.name}</h2>
                  </div>
                  <div className="p-4 flex items-center gap-2 text-slate-500 w-full bg-white">
                    <Scissors size={16} />
                    <span className="text-sm font-medium">{barber.role || 'Profesional'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col h-full relative">
            <div className="bg-[#0B3B24] pt-10 pb-5 px-5 shadow-md shrink-0 md:pt-12">
              <div className="flex items-center gap-4">
                <button onClick={() => setStep(1)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div className="text-white">
                  <h2 className="text-xl font-black leading-tight">{selectedBarber?.name}</h2>
                  <p className="text-xs text-emerald-200 font-medium">{selectedBarber?.role || 'Profesional'}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-40 bg-white/50">
              <div className="p-5">
                <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3">1. Fecha</h3>
                <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar">
                  {dates.map((d, i) => {
                    const isSelected = selectedDate === d.fullDate;
                    return (
                      <button
                        key={i}
                        onClick={() => { setSelectedDate(d.fullDate); setSelectedTime(null); }}
                        className={`snap-start shrink-0 w-[4.5rem] h-20 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
                          isSelected 
                            ? 'bg-[#0B3B24] border-[#0B3B24] text-white shadow-md transform scale-105' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-[#0B3B24]/30'
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>{d.dayName}</span>
                        <span className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-[#0B3B24]'}`}>{d.dayNum}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="px-5 pb-5">
                <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3 flex items-center gap-2">
                  <Clock size={14}/> 2. Horario {isLoadingTimes && <span className="text-emerald-500 animate-pulse text-[10px]">(Cargando...)</span>}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {allTimes.map((time, i) => {
                    const isSelected = selectedTime === time.value24;
                    // TODO: Mejorar lógica cuando se pueda cruzar con un horario ya ocupado
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
                              ? 'bg-[#eaf4ed] border-emerald-500 text-emerald-800 shadow-sm transform scale-105'
                              : 'bg-white border-slate-100 text-[#0B3B24] hover:border-[#0B3B24]/30 shadow-sm'
                        }`}
                      >
                        {time.label12}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="px-5 pb-8">
                <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3">3. Tus Datos</h3>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                  <input 
                    type="text" 
                    placeholder="Tu Nombre" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50/50 rounded-xl px-4 py-3 text-base font-medium text-[#0B3B24] border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24] transition-all"
                  />
                  <input 
                    type="text" 
                    placeholder="Tu Apellido" 
                    value={customerLastName}
                    onChange={(e) => setCustomerLastName(e.target.value)}
                    className="w-full bg-slate-50/50 rounded-xl px-4 py-3 text-base font-medium text-[#0B3B24] border border-slate-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-100 p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] shrink-0 z-20">
              {errorMessage && (
                <div className="mb-3 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-center animate-bounce">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="mb-3 p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 text-center">
                  {successMessage} Redirigiendo a WhatsApp...
                </div>
              )}
              <button
                disabled={!selectedTime || !customerName || !customerLastName || isSubmitting || !!successMessage}
                onClick={handleConfirm}
                className="w-full bg-[#D4C3A3] hover:bg-[#c2af8e] disabled:bg-slate-200 disabled:text-slate-400 text-[#0B3B24] disabled:opacity-70 py-4 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-sm"
              >
                {isSubmitting ? 'Procesando...' : !selectedTime ? 'Selecciona una hora' : (!customerName || !customerLastName) ? 'Ingresa tus datos' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        )}

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
