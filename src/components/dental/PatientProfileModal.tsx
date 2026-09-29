'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldAlert, 
  Heart, 
  Pill, 
  AlertTriangle, 
  Save, 
  RefreshCw,
  FileText,
  MapPin,
  UserCheck
} from 'lucide-react';
import { Entity } from '@/lib/api/entities';
import { updateEntityAction, ActionActor } from '@/app/actions/entities';
import { useToast } from '@/components/core/ToastProvider';

interface PatientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Entity | null;
  tenantId: string;
  actor: ActionActor;
  onSuccess: (updatedPatient: Entity) => void;
}

const COMMON_ALLERGIES = ['Penicilina', 'Amoxicilina', 'AINEs / Ibuprofeno', 'Aspirina', 'Látex', 'Anestésicos Locales', 'Sulfas'];
const COMMON_SYSTEMIC = ['Hipertensión Arterial', 'Diabetes Mellitus', 'Cardiopatía', 'Asma Bronquial', 'Epilepsia', 'Hepatitis', 'VIH'];

export function PatientProfileModal({
  isOpen,
  onClose,
  patient,
  tenantId,
  actor,
  onSuccess,
}: PatientProfileModalProps) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<'personal' | 'historia'>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Datos personales
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Anamnesis / Historia Médica
  const [allergies, setAllergies] = useState('');
  const [systemicDiseases, setSystemicDiseases] = useState('');
  const [currentMedication, setCurrentMedication] = useState('');
  const [anticoagulants, setAnticoagulants] = useState('');
  const [pregnantOrNursing, setPregnantOrNursing] = useState(false);
  const [habits, setHabits] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Calcular edad en tiempo real a partir de fecha de nacimiento
  const calculatedAge = birthDate
    ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  useEffect(() => {
    if (patient) {
      setName(patient.name || '');
      setTaxId(patient.tax_id || '');
      setPhone(patient.phone || '');
      setEmail(patient.email || '');
      setAddress(patient.address || '');

      const meta = (patient.metadata as Record<string, any>) || {};
      setBirthDate(meta.birth_date || '');
      setEmergencyContact(meta.emergency_contact || '');
      setEmergencyPhone(meta.emergency_phone || '');

      setAllergies(meta.allergies || '');
      setSystemicDiseases(meta.systemic_diseases || '');
      setCurrentMedication(meta.current_medication || '');
      setAnticoagulants(meta.anticoagulants || '');
      setPregnantOrNursing(Boolean(meta.pregnant_or_nursing));
      setHabits(meta.habits || '');
      setClinicalNotes(meta.clinical_notes || meta.notes || '');
    }
  }, [patient]);

  if (!isOpen || !patient) return null;

  const handleAddAllergyBadge = (allergy: string) => {
    if (!allergies.toLowerCase().includes(allergy.toLowerCase())) {
      setAllergies(prev => prev ? `${prev}, ${allergy}` : allergy);
    }
  };

  const handleAddSystemicBadge = (disease: string) => {
    if (!systemicDiseases.toLowerCase().includes(disease.toLowerCase())) {
      setSystemicDiseases(prev => prev ? `${prev}, ${disease}` : disease);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'warning', title: 'Nombre requerido', description: 'Por favor ingresa el nombre del paciente.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const existingMeta = (patient.metadata as Record<string, any>) || {};
      const updatedMetadata = {
        ...existingMeta,
        birth_date: birthDate || null,
        emergency_contact: emergencyContact.trim() || null,
        emergency_phone: emergencyPhone.trim() || null,
        allergies: allergies.trim() || null,
        systemic_diseases: systemicDiseases.trim() || null,
        current_medication: currentMedication.trim() || null,
        anticoagulants: anticoagulants.trim() || null,
        pregnant_or_nursing: pregnantOrNursing,
        habits: habits.trim() || null,
        clinical_notes: clinicalNotes.trim() || null,
        last_medical_review: new Date().toISOString(),
      };

      const res = await updateEntityAction(
        patient.id,
        {
          name: name.trim(),
          tax_id: taxId.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          metadata: updatedMetadata,
        },
        tenantId,
        actor
      );

      if (res.success && res.entity) {
        toast({
          variant: 'success',
          title: 'Ficha Clínica Actualizada',
          description: `Se guardaron los antecedentes y datos de ${name}.`,
        });
        onSuccess(res.entity);
        onClose();
      } else {
        toast({
          variant: 'error',
          title: 'Error al actualizar',
          description: res.error || 'No se pudo guardar la ficha del paciente.',
        });
      }
    } catch (err: unknown) {
      toast({
        variant: 'error',
        title: 'Error de conexión',
        description: (err as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">Ficha del Paciente & Antecedentes</h2>
              <p className="text-xs text-slate-500">
                {patient.name} {calculatedAge !== null ? `· ${calculatedAge} años` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-foreground rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas internas de la ficha */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-border bg-card">
          <button
            type="button"
            onClick={() => setActiveSection('personal')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeSection === 'personal'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-black'
                : 'border-transparent text-slate-400 hover:text-foreground'
            }`}
          >
            <User size={14} />
            <span>Datos Personales & Contacto</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('historia')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeSection === 'historia'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-black'
                : 'border-transparent text-slate-400 hover:text-foreground'
            }`}
          >
            <ShieldAlert size={14} className={allergies || systemicDiseases ? 'text-rose-500' : ''} />
            <span>Historia Médica & Alertas</span>
            {(allergies || systemicDiseases) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeSection === 'personal' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Cédula / DNI / RIF</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Ej. V-12345678"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-mono font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +58 412 1234567"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Fecha de Nacimiento {calculatedAge !== null && `(${calculatedAge} años)`}
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Dirección de Habitación</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ciudad, Sector, Calle..."
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-border rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contacto en Caso de Emergencia
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Nombre del familiar o tutor"
                    className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground"
                  />
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="Teléfono de emergencia"
                    className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'historia' && (
            <div className="space-y-4">
              {/* Alergias */}
              <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert size={14} />
                    Alergias a Fármacos o Materiales
                  </label>
                  <span className="text-[10px] text-slate-400">Vital antes de anestesia o recetas</span>
                </div>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Ej. Alergia a Penicilina, Látex, AINEs..."
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-rose-500/30"
                />
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {COMMON_ALLERGIES.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => handleAddAllergyBadge(badge)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                    >
                      + {badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enfermedades Sistémicas */}
              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl space-y-2">
                <label className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Heart size={14} />
                  Enfermedades Sistémicas / Crónicas
                </label>
                <input
                  type="text"
                  value={systemicDiseases}
                  onChange={(e) => setSystemicDiseases(e.target.value)}
                  placeholder="Ej. Hipertensión controlada con Losartán, Diabetes tipo 2..."
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-amber-500/30"
                />
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {COMMON_SYSTEMIC.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => handleAddSystemicBadge(badge)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                    >
                      + {badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medicación & Anticoagulantes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Medicación Habitual Actual</label>
                  <input
                    type="text"
                    value={currentMedication}
                    onChange={(e) => setCurrentMedication(e.target.value)}
                    placeholder="Ej. Eutirox 50mcg, Metformina..."
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Tratamiento Anticoagulante</label>
                  <input
                    type="text"
                    value={anticoagulants}
                    onChange={(e) => setAnticoagulants(e.target.value)}
                    placeholder="Ej. Aspirina 100mg, Warfarina..."
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>
              </div>

              {/* Checkboxes de alerta rápida */}
              <div className="flex items-center gap-4 flex-wrap pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={pregnantOrNursing}
                    onChange={(e) => setPregnantOrNursing(e.target.checked)}
                    className="accent-teal-500 rounded"
                  />
                  <span>Paciente en Embarazo o Período de Lactancia</span>
                </label>
              </div>

              {/* Hábitos & Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Hábitos Orales / Generales</label>
                  <input
                    type="text"
                    value={habits}
                    onChange={(e) => setHabits(e.target.value)}
                    placeholder="Ej. Bruxismo nocturno, Fumador, Onicofagia..."
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Observaciones Clínicas Generales</label>
                  <input
                    type="text"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Notas para el odontólogo de guardia..."
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border text-slate-500 hover:text-foreground rounded-xl text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5 btn-haptic disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Guardar Ficha del Paciente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
