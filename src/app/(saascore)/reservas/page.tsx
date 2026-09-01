"use client";
import { useState, useEffect } from 'react';
import { useToast } from '@/components/core/ToastProvider';
import { getAvailableSlots, createReservation } from '@/lib/reservations';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default function ReservasPage() {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const s = await getAvailableSlots(date);
      setSlots(s);
    }
    load();
  }, [date]);

  const handleReserve = async (slot: string) => {
    setLoading(true);
    const res = await createReservation({ email, start: slot, end: slot });
    setLoading(false);
    if (res.success) {
      toast({ variant: 'success', title: 'Reserva creada', description: `Slot ${slot} reservado` });
    } else {
      toast({ variant: 'error', title: 'Error', description: res.error });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Reservas</h1>
      <label className="block mb-2">Fecha:</label>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="border p-2 mb-4"
      />
      <label className="block mb-2">Email:</label>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="border p-2 mb-4"
      />
      <ul>
        {slots.map(slot => (
          <li key={slot} className="flex justify-between items-center py-2 border-b">
            <span>{slot}</span>
            <button
              onClick={() => handleReserve(slot)}
              disabled={loading}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Reservar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
