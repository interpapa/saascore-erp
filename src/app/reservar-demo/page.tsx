'use client';

import { useState } from 'react';
import { ArrowLeft, Scissors, Clock } from 'lucide-react';

// --- DATOS FALSOS PARA LA MAQUETA ---
const BARBERS = [
  { id: '1', name: 'Carlos', role: 'Barbero Principal', status: 'Disponible' },
  { id: '2', name: 'Miguel', role: 'Especialista en degradados', status: 'Ocupado' },
  { id: '3', name: 'Andrés', role: 'Barbero', status: 'Disponible' },
];

const GENERATE_DATES = () => {
  const dates = [];
  const today = new Date();
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      dateObj: d,
      dayName: i === 0 ? 'HOY' : dayNames[d.getDay()],
      dayNum: d.getDate(),
      fullDate: d.toISOString().split('T')[0]
    });
  }
  return dates;
};

const TIMES = [
  { time: '09:00', available: true },
  { time: '09:45', available: false }, // Ocupado
  { time: '10:30', available: true },
  { time: '11:15', available: true },
  { time: '12:00', available: false },
  { time: '13:30', available: true },
  { time: '14:15', available: true },
  { time: '15:00', available: true },
  { time: '16:30', available: false },
  { time: '17:15', available: true },
  { time: '18:00', available: true },
];

import { processBookingAction } from '@/app/actions/booking';

export default function ReservarDemo() {
  const [step, setStep] = useState(1);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  
  const dates = GENERATE_DATES();
  const [selectedDate, setSelectedDate] = useState(dates[0].fullDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBarberSelect = (barber: any) => {
    setSelectedBarber(barber);
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!selectedTime || !customerName || !customerLastName) return;
    
    setIsSubmitting(true);
    setErrorMessage('');

    // 1. Llamar al Server Action Seguro
    const result = await processBookingAction({
      barberId: selectedBarber.id,
      date: selectedDate,
      time: selectedTime,
      firstName: customerName,
      lastName: customerLastName,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Ocurrió un error inesperado');
      return;
    }

    // 2. Si es exitoso (pasó el Rate Limit y Zod), redirigimos a WhatsApp
    const phone = "5804245642100"; // Número real de la barbería
    const text = `¡Hola! Quiero confirmar mi reserva con ${selectedBarber.name} para el día ${selectedDate} a las ${selectedTime}. Mi nombre es ${customerName} ${customerLastName}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] md:bg-slate-200 flex justify-center items-center font-sans text-slate-800 md:p-8">
      <div className="w-full h-full md:h-[850px] max-w-md bg-[#F9F6F0] relative shadow-2xl flex flex-col md:rounded-[2.5rem] overflow-hidden border border-slate-200/50">
        
        {/* PANTALLA 1: SELECCIÓN DE BARBERO */}
        {step === 1 && (
          <div className="flex flex-col h-full">
            <div className="bg-[#0B3B24] pt-12 pb-8 px-6 shadow-md z-10 md:pt-16">
              <h1 className="text-white text-3xl font-black mb-1">Tu Barbería</h1>
              <p className="text-emerald-100/80 text-sm">Selecciona con quién quieres agendar hoy</p>
            </div>
            
            <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-white/50">
              {BARBERS.map(barber => (
                <button
                  key={barber.id}
                  onClick={() => handleBarberSelect(barber)}
                  className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:border-[#0B3B24]/30 hover:shadow-md text-left transition-all active:scale-95 flex flex-col"
                >
                  <div className="bg-[#eaf4ed] p-5 relative w-full">
                    <div className="absolute top-4 right-4">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${barber.status === 'Disponible' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                        {barber.status}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-[#0B3B24]">{barber.name}</h2>
                  </div>
                  <div className="p-4 flex items-center gap-2 text-slate-500 w-full bg-white">
                    <Scissors size={16} />
                    <span className="text-sm font-medium">{barber.role}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PANTALLA 2: FECHA, HORA Y DATOS */}
        {step === 2 && (
          <div className="flex flex-col h-full relative">
            {/* Header Sticky */}
            <div className="bg-[#0B3B24] pt-10 pb-5 px-5 shadow-md shrink-0 md:pt-12">
              <div className="flex items-center gap-4">
                <button onClick={() => setStep(1)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div className="text-white">
                  <h2 className="text-xl font-black leading-tight">{selectedBarber?.name}</h2>
                  <p className="text-xs text-emerald-200 font-medium">{selectedBarber?.role}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-32 bg-white/50">
              {/* Fechas */}
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

              {/* Horas */}
              <div className="px-5 pb-5">
                <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3 flex items-center gap-2">
                  <Clock size={14}/> 2. Horario
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {TIMES.map((t, i) => {
                    const isSelected = selectedTime === t.time;
                    return (
                      <button
                        key={i}
                        disabled={!t.available}
                        onClick={() => setSelectedTime(t.time)}
                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                          !t.available 
                            ? 'bg-slate-100 border-transparent text-slate-300 cursor-not-allowed line-through' 
                            : isSelected 
                              ? 'bg-[#eaf4ed] border-emerald-500 text-emerald-800 shadow-sm transform scale-105'
                              : 'bg-white border-slate-100 text-[#0B3B24] hover:border-[#0B3B24]/30 shadow-sm'
                        }`}
                      >
                        {t.time}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Datos del Cliente */}
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

            {/* Bottom Bar Fija */}
            <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-100 p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] shrink-0 z-20">
              {errorMessage && (
                <div className="mb-3 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-center animate-bounce">
                  {errorMessage}
                </div>
              )}
              <button
                disabled={!selectedTime || !customerName || !customerLastName || isSubmitting}
                onClick={handleConfirm}
                className="w-full bg-[#D4C3A3] hover:bg-[#c2af8e] disabled:bg-slate-200 disabled:text-slate-400 text-[#0B3B24] disabled:opacity-70 py-4 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 shadow-sm"
              >
                {isSubmitting ? 'Verificando seguridad...' : !selectedTime ? 'Selecciona una hora' : (!customerName || !customerLastName) ? 'Ingresa tus datos' : 'Confirmar Reserva'}
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
