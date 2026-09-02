import Link from 'next/link';

export default function ReservasNotFound() {
  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center p-6 font-sans text-slate-800">
      <div className="bg-white p-10 rounded-[2rem] shadow-xl text-center max-w-sm w-full border border-slate-100">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h1 className="text-2xl font-black text-[#0B3B24] mb-3">Enlace no válido</h1>
        <p className="text-slate-500 text-sm font-medium leading-relaxed">
          La página de reservas que intentas visitar no existe o el enlace está incompleto.
        </p>
        <p className="text-slate-400 text-xs mt-6">
          Por favor, verifica el enlace con el comercio.
        </p>
      </div>
    </div>
  );
}
