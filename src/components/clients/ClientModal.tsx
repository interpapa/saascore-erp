'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, User, Mail, MapPin, Building, Tag, FileText, Calendar, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { CustomFieldDefinition } from '@/lib/core/industryTemplates';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: any) => Promise<void>;
  initialData?: any;
  customSchema?: CustomFieldDefinition[];
}

export function ClientModal({ isOpen, onClose, onSave, initialData, customSchema = [] }: ClientModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos principales
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [entitySubtype, setEntitySubtype] = useState<'natural' | 'juridica'>('natural');

  // Identificación fiscal venezolana (V, J, E, G)
  const [docPrefix, setDocPrefix] = useState<'V' | 'J' | 'E' | 'G'>('V');
  const [docNumber, setDocNumber] = useState('');

  // Fecha de nacimiento desglosada para facilidad total
  const [birthDate, setBirthDate] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [dateInputMode, setDateInputMode] = useState<'dropdown' | 'age' | 'native'>('dropdown');

  // Metadatos adicionales
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Listas de días, meses y años para los dropdowns
  const currentYear = new Date().getFullYear();
  const YEARS = useMemo(() => Array.from({ length: 110 }, (_, i) => String(currentYear - i)), [currentYear]);
  const DAYS = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  const MONTHS = [
    { val: '01', label: 'Enero' },
    { val: '02', label: 'Febrero' },
    { val: '03', label: 'Marzo' },
    { val: '04', label: 'Abril' },
    { val: '05', label: 'Mayo' },
    { val: '06', label: 'Junio' },
    { val: '07', label: 'Julio' },
    { val: '08', label: 'Agosto' },
    { val: '09', label: 'Septiembre' },
    { val: '10', label: 'Octubre' },
    { val: '11', label: 'Noviembre' },
    { val: '12', label: 'Diciembre' },
  ];

  // Sincronizar estado cuando initialData cambia
  useEffect(() => {
    if (initialData) {
      setFullName(initialData.name || '');
      setPhone(initialData.phone || '');
      setEmail(initialData.email || '');
      setAddress(initialData.address || '');

      const meta = initialData.metadata || {};
      setEntitySubtype(meta.entity_subtype || 'natural');
      setNotes(meta.notes || '');
      setTags(Array.isArray(meta.tags) ? meta.tags : []);
      setCustomValues(meta.custom_fields || {});

      // Parsear fecha de nacimiento
      const rawBirth = meta.birth_date || '';
      setBirthDate(rawBirth);
      if (rawBirth && rawBirth.includes('-')) {
        const [y, m, d] = rawBirth.split('-');
        setBirthYear(y || '');
        setBirthMonth(m || '');
        setBirthDay(d ? d.slice(0, 2) : '');
      } else {
        setBirthYear('');
        setBirthMonth('');
        setBirthDay('');
      }
      setAgeInput('');

      // Parsear tax_id si existe
      if (initialData.tax_id) {
        const rawTax = initialData.tax_id.trim();
        const prefixMatch = rawTax.match(/^([VJEGvjeg])[-_\s]?(.*)$/);
        if (prefixMatch) {
          setDocPrefix(prefixMatch[1].toUpperCase() as any);
          setDocNumber(prefixMatch[2].replace(/^[VJEGvjeg][-\s]?/, ''));
        } else {
          setDocNumber(rawTax);
        }
      } else {
        setDocNumber('');
      }
    } else {
      setFullName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setEntitySubtype('natural');
      setDocPrefix('V');
      setDocNumber('');
      setBirthDate('');
      setBirthDay('');
      setBirthMonth('');
      setBirthYear('');
      setAgeInput('');
      setNotes('');
      setTags([]);
      setCustomValues({});
      setError(null);
    }
  }, [initialData, isOpen]);

  // Actualizar birthDate cuando cambian día, mes o año
  const handleDateDropdownChange = (newYear: string, newMonth: string, newDay: string) => {
    setBirthYear(newYear);
    setBirthMonth(newMonth);
    setBirthDay(newDay);

    if (newYear && newMonth && newDay) {
      const formatted = `${newYear}-${newMonth.padStart(2, '0')}-${newDay.padStart(2, '0')}`;
      setBirthDate(formatted);
    } else if (!newYear && !newMonth && !newDay) {
      setBirthDate('');
    }
  };

  // Actualizar por edad directa (en años)
  const handleAgeInputChange = (ageVal: string) => {
    setAgeInput(ageVal);
    const parsedAge = parseInt(ageVal, 10);
    if (!isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 120) {
      const calculatedYear = String(currentYear - parsedAge);
      setBirthYear(calculatedYear);
      setBirthMonth('01');
      setBirthDay('01');
      setBirthDate(`${calculatedYear}-01-01`);
    } else if (!ageVal) {
      setBirthDate('');
      setBirthYear('');
      setBirthMonth('');
      setBirthDay('');
    }
  };

  // Calcular edad si hay fecha de nacimiento válida
  const calculatedAge = useMemo(() => {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return null;
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 0 && age <= 130 ? age : null;
  }, [birthDate]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('El nombre o razón social es obligatorio.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Limpiar prefijo repetido en el documento (ej. si el usuario escribe V-12345678, limpiamos la V inicial)
    const cleanDoc = docNumber.replace(/^[VJEGvjeg][-\s]?/, '').trim();
    const fullTaxId = cleanDoc ? `${docPrefix}-${cleanDoc}` : null;

    const clientData = {
      full_name: fullName.trim(),
      phone: phone || null,
      email: email.trim() || null,
      tax_id: fullTaxId,
      address: address.trim() || null,
      total_debt: initialData ? (initialData.metadata?.total_debt || 0) : 0,
      metadata: {
        ...(initialData?.metadata || {}),
        entity_subtype: entitySubtype,
        birth_date: birthDate || null,
        notes: notes.trim() || null,
        tags: tags,
        custom_fields: customValues,
      }
    };

    try {
      await onSave(clientData);
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Error al guardar el contacto. Intenta de nuevo.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const PRESET_TAGS = ['VIP', 'Frecuente', 'Paciente', 'Corporativo', 'Asegurado'];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg max-h-[92vh] bg-card border border-border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 font-black">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">
                {initialData ? 'Editar Ficha de Contacto' : 'Nuevo Contacto / Paciente'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Información general, identificación y datos de perfil
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-bold flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Tipo (Natural vs Jurídica) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-border text-xs">
            <button
              type="button"
              onClick={() => {
                setEntitySubtype('natural');
                if (docPrefix === 'J' || docPrefix === 'G') setDocPrefix('V');
              }}
              className={`py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                entitySubtype === 'natural'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <User size={13} />
              <span>Persona Natural (Cédula)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntitySubtype('juridica');
                if (docPrefix === 'V' || docPrefix === 'E') setDocPrefix('J');
              }}
              className={`py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                entitySubtype === 'juridica'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <Building size={13} />
              <span>Empresa / Jurídica (RIF)</span>
            </button>
          </div>

          {/* Nombre Completo o Razón Social */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {entitySubtype === 'natural' ? 'Nombre y Apellidos *' : 'Razón Social / Nombre Comercial *'}
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder={entitySubtype === 'natural' ? 'Ej. María Pérez' : 'Ej. Distribuidora Los Andes C.A.'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Cédula / RIF Bimoneda Estructurado */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Documento de Identidad (Cédula / RIF)
            </label>
            <div className="flex gap-2">
              <select
                value={docPrefix}
                onChange={(e) => setDocPrefix(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-black text-foreground shrink-0 focus:outline-hidden"
              >
                <option value="V">V- (Venezolano)</option>
                <option value="E">E- (Extranjero)</option>
                <option value="J">J- (Jurídico)</option>
                <option value="G">G- (Gubernamental)</option>
              </select>
              <input
                type="text"
                placeholder="12345678"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Solo los números (ej. 12345678). El prefijo se incluye automáticamente.</p>
          </div>

          {/* Teléfono / WhatsApp */}
          <div>
            <PhoneInput
              label="Teléfono / WhatsApp"
              value={phone}
              onChange={setPhone}
              placeholder="412 1234567"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Correo Electrónico (Opcional)
            </label>
            <input
              type="email"
              placeholder="cliente@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Fecha de Nacimiento / Edad Super Intuitiva */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-primary" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Fecha de Nacimiento o Edad
                </span>
              </div>
              {calculatedAge !== null && (
                <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {calculatedAge} años
                </span>
              )}
            </div>

            {/* Pestañas de modo de entrada de fecha */}
            <div className="flex items-center gap-1 border-b border-border/50 pb-2 text-[11px]">
              <button
                type="button"
                onClick={() => setDateInputMode('dropdown')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  dateInputMode === 'dropdown'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-slate-400 hover:text-foreground'
                }`}
              >
                📅 Seleccionar Año/Mes/Día
              </button>

              <button
                type="button"
                onClick={() => setDateInputMode('age')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  dateInputMode === 'age'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-slate-400 hover:text-foreground'
                }`}
              >
                🎂 Ingresar solo la Edad
              </button>

              <button
                type="button"
                onClick={() => setDateInputMode('native')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  dateInputMode === 'native'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-slate-400 hover:text-foreground'
                }`}
              >
                🗓️ Calendario
              </button>
            </div>

            {/* MODO 1: Dropdowns rápidos para año, mes y día (¡sin scrollear 500 meses!) */}
            {dateInputMode === 'dropdown' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Día</label>
                  <select
                    value={birthDay}
                    onChange={(e) => handleDateDropdownChange(birthYear, birthMonth, e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground"
                  >
                    <option value="">Día</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Mes</label>
                  <select
                    value={birthMonth}
                    onChange={(e) => handleDateDropdownChange(birthYear, e.target.value, birthDay)}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground"
                  >
                    <option value="">Mes</option>
                    {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Año</label>
                  <select
                    value={birthYear}
                    onChange={(e) => handleDateDropdownChange(e.target.value, birthMonth, birthDay)}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-black text-foreground"
                  >
                    <option value="">Año</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* MODO 2: Ingresar solo edad (ej. 35 años) */}
            {dateInputMode === 'age' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="Ej. 35"
                  value={ageInput || (calculatedAge !== null ? String(calculatedAge) : '')}
                  onChange={(e) => handleAgeInputChange(e.target.value)}
                  className="w-28 bg-background border border-border rounded-xl px-3 py-1.5 text-sm font-black font-mono text-foreground focus:outline-hidden"
                />
                <span className="text-xs font-bold text-slate-500">años de edad</span>
                {birthDate && (
                  <span className="text-[10px] font-mono text-slate-400 ml-auto">
                    Fecha estimada: {birthDate}
                  </span>
                )}
              </div>
            )}

            {/* MODO 3: Input de fecha nativo */}
            {dateInputMode === 'native' && (
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={birthDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setBirthDate(val);
                  if (val.includes('-')) {
                    const [y, m, d] = val.split('-');
                    setBirthYear(y);
                    setBirthMonth(m);
                    setBirthDay(d);
                  }
                }}
                className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-hidden"
              />
            )}
          </div>

          {/* Dirección */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Dirección de Habitación / Entrega
            </label>
            <input
              type="text"
              placeholder="Av. Principal, Edificio / Casa, Ciudad"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Etiquetas / Segmentos Rápidos */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Etiquetas / Segmentación
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-slate-500 hover:border-slate-400'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos Personalizados de la Empresa / Industria */}
          {customSchema && customSchema.length > 0 && (
            <div className="pt-2 border-t border-border space-y-3">
              <span className="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-1 tracking-wider">
                <Sparkles size={12} />
                <span>Campos de Especialidad ({customSchema.length})</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customSchema.map((field) => (
                  <div key={field.field_key}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {field.field_label} {field.is_required && '*'}
                    </label>

                    {field.field_type === 'select' ? (
                      <select
                        value={customValues[field.field_key] || ''}
                        onChange={(e) => setCustomValues({ ...customValues, [field.field_key]: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground"
                      >
                        <option value="">Seleccionar...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.field_type === 'boolean' ? (
                      <label className="flex items-center gap-2 p-2 rounded-xl border border-border bg-background cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!customValues[field.field_key]}
                          onChange={(e) => setCustomValues({ ...customValues, [field.field_key]: e.target.checked })}
                          className="rounded text-primary focus:ring-0"
                        />
                        <span className="text-xs font-bold text-foreground">Activo / Sí</span>
                      </label>
                    ) : (
                      <input
                        type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                        value={customValues[field.field_key] || ''}
                        onChange={(e) => setCustomValues({ ...customValues, [field.field_key]: e.target.value })}
                        placeholder={`Ingresa ${field.field_label.toLowerCase()}...`}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas Internas / Alergias / Observaciones Privadas */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Notas Internas / Alergias / Observaciones (Privado para el personal)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Alérgico a penicilina, prefiere atención los sábados, cliente muy puntual..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Botones de Envío */}
          <div className="pt-2 flex gap-3 sticky bottom-0 bg-card mt-auto border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full rounded-xl"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-full rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : (initialData ? 'Actualizar Ficha' : 'Guardar Contacto')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
