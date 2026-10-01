'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Layers, 
  ChevronRight, 
  Save, 
  RefreshCw, 
  Trash2,
  ShieldAlert,
  Send,
  Check,
  Palette,
  Stethoscope,
  Users
} from 'lucide-react';
import { 
  OrthodonticCase, 
  OrthodonticVisit, 
  OrthoTechnique, 
  WireMaterial, 
  WireSize, 
  LigatureType 
} from '@/types/dentalSpecialties';
import { saveOrthodonticCaseAction, getOrthodonticCaseAction, sendDentalOrderToCashierAction } from '@/app/actions/dental';
import { ModuleStaffMember, getModuleStaffAction } from '@/app/actions/moduleStaff';
import { DentalPricingConfig, getModulePricingConfigAction } from '@/app/actions/modulePricing';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';

interface OrthodonticsTrackerProps {
  patientId: string;
  patientName: string;
}

const ELASTIC_COLORS = [
  { name: 'Plata / Gris', hex: '#94a3b8' },
  { name: 'Azul Real', hex: '#2563eb' },
  { name: 'Azul Celeste', hex: '#38bdf8' },
  { name: 'Rojo Pasión', hex: '#dc2626' },
  { name: 'Fucsia Neón', hex: '#db2777' },
  { name: 'Lila Pastel', hex: '#a855f7' },
  { name: 'Negro Elegante', hex: '#1e293b' },
  { name: 'Turquesa Mar', hex: '#0d9488' },
  { name: 'Verde Neón', hex: '#16a34a' },
  { name: 'Transparente / Estético', hex: '#e2e8f0' }
];

export function OrthodonticsTracker({ patientId, patientName }: OrthodonticsTrackerProps) {
  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const effectiveActor = actor || { email: 'doctor@saascore.local', role: 'technician' as const };
  const { toast } = useToast();
  const tenantId = currentTenant?.id || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingCashier, setIsSendingCashier] = useState(false);
  const [orthoCase, setOrthoCase] = useState<OrthodonticCase | null>(null);

  // Doctores y Aranceles dinámicos
  const [dentalStaff, setDentalStaff] = useState<ModuleStaffMember[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [clinicPricing, setClinicPricing] = useState<DentalPricingConfig>({
    orthoMonthlyFeeUSD: 35,
    bracketReplacementFeeUSD: 10,
    endoCanalBaseUSD: 40,
    perioCleaningBaseUSD: 30,
    defaultDoctorCommissionPercent: 50
  });

  // Formulario de nueva visita de activación
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [upperMaterial, setUpperMaterial] = useState<WireMaterial>('niti_thermal');
  const [upperSize, setUpperSize] = useState<WireSize>('.014');
  const [upperLigature, setUpperLigature] = useState<LigatureType>('elastic_individual');
  const [upperColor, setUpperColor] = useState(ELASTIC_COLORS[0]);

  const [lowerMaterial, setLowerMaterial] = useState<WireMaterial>('niti_thermal');
  const [lowerSize, setLowerSize] = useState<WireSize>('.014');
  const [lowerLigature, setLowerLigature] = useState<LigatureType>('elastic_individual');
  const [lowerColor, setLowerColor] = useState(ELASTIC_COLORS[0]);

  const [elasticVector, setElasticVector] = useState<'none' | 'class_II' | 'class_III' | 'box_anterior' | 'triangular' | 'midline'>('none');
  const [droppedBracketInput, setDroppedBracketInput] = useState('');
  const [droppedTeeth, setDroppedTeeth] = useState<string[]>([]);
  const [chargeDropped, setChargeDropped] = useState(false);
  const [hygieneStatus, setHygieneStatus] = useState<'excellent' | 'good' | 'poor_warning'>('good');
  const [visitNotes, setVisitNotes] = useState('');

  // Cargar caso de ortodoncia y configuración clínica
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [res, staffRes, pricingRes] = await Promise.all([
          getOrthodonticCaseAction(patientId, tenantId, effectiveActor),
          getModuleStaffAction(tenantId, 'odontologia', effectiveActor),
          getModulePricingConfigAction<DentalPricingConfig>(tenantId, 'odontologia', effectiveActor)
        ]);

        if (staffRes.success && staffRes.staff) {
          setDentalStaff(staffRes.staff);
        }

        let defaultMonthly = 35.0;
        let defaultBracketCost = 10.0;
        if (pricingRes.success && pricingRes.config) {
          setClinicPricing(pricingRes.config);
          defaultMonthly = pricingRes.config.orthoMonthlyFeeUSD || 35.0;
          defaultBracketCost = pricingRes.config.bracketReplacementFeeUSD || 10.0;
        }

        if (res.success && res.orthoCase) {
          setOrthoCase(res.orthoCase);
          if (res.orthoCase.doctorId) {
            setSelectedDoctorId(res.orthoCase.doctorId);
          } else if (staffRes.staff && staffRes.staff.length > 0) {
            setSelectedDoctorId(staffRes.staff[0].id);
          }
        } else {
          const firstDoctor = staffRes.staff?.[0];
          setSelectedDoctorId(firstDoctor?.id || '');

          // Caso inicial por defecto con tarifas del consultorio
          setOrthoCase({
            patientId,
            technique: 'metal_roth',
            slotSize: '.022',
            angleClassification: 'class_I',
            crowding: 'moderate',
            crossbite: 'none',
            openBite: false,
            deepBite: false,
            plannedExtractions: [],
            startDate: new Date().toISOString().split('T')[0],
            estimatedMonths: 18,
            monthlyFeeUSD: defaultMonthly,
            bracketReplacementFeeUSD: defaultBracketCost,
            doctorId: firstDoctor?.id,
            doctorName: firstDoctor?.name,
            doctorCommissionPercent: firstDoctor?.commissionPercent || 50,
            status: 'active',
            visits: []
          });
        }
      } catch (err) {
        console.error('Error al cargar caso de ortodoncia:', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (patientId && tenantId) {
      loadData();
    }
  }, [patientId, tenantId]);

  const handleSaveCase = async (updatedCase: OrthodonticCase) => {
    setIsSaving(true);
    try {
      const res = await saveOrthodonticCaseAction(patientId, updatedCase, tenantId, effectiveActor);
      if (res.success) {
        setOrthoCase(updatedCase);
        toast({
          variant: 'success',
          title: 'Expediente guardado',
          description: 'Los parámetros del caso de ortodoncia se actualizaron correctamente.',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Error al guardar',
          description: res.error || 'No se pudo guardar el expediente.',
        });
      }
    } catch {
      toast({
        variant: 'error',
        title: 'Error de red',
        description: 'No se pudo contactar al servidor.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDroppedTooth = () => {
    const tooth = droppedBracketInput.trim();
    if (tooth && !droppedTeeth.includes(tooth)) {
      setDroppedTeeth([...droppedTeeth, tooth]);
      setDroppedBracketInput('');
    }
  };

  const handleRemoveDroppedTooth = (tooth: string) => {
    setDroppedTeeth(droppedTeeth.filter(t => t !== tooth));
  };

  const handleRegisterVisit = async () => {
    if (!orthoCase) return;

    const activeDoctor = dentalStaff.find(d => d.id === selectedDoctorId);
    const droppedCost = chargeDropped ? (droppedTeeth.length * (orthoCase.bracketReplacementFeeUSD || 10)) : 0;
    const totalChargeUSD = (orthoCase.monthlyFeeUSD || 35) + droppedCost;

    const newVisit: OrthodonticVisit = {
      id: `visit-${Date.now()}`,
      date: new Date().toISOString(),
      sessionNumber: (orthoCase.visits?.length || 0) + 1,
      performer: activeDoctor ? `${activeDoctor.name} (${activeDoctor.role})` : effectiveActor.email,
      doctorId: activeDoctor?.id,
      doctorName: activeDoctor?.name,
      doctorCommissionPercent: activeDoctor?.commissionPercent || clinicPricing.defaultDoctorCommissionPercent,
      archUpper: {
        wireMaterial: upperMaterial,
        wireSize: upperSize,
        ligatureType: upperLigature,
        colorName: upperColor.name,
        colorHex: upperColor.hex
      },
      archLower: {
        wireMaterial: lowerMaterial,
        wireSize: lowerSize,
        ligatureType: lowerLigature,
        colorName: lowerColor.name,
        colorHex: lowerColor.hex
      },
      elastics: {
        vector: elasticVector,
        force: 'medium_4.5oz',
        size: '3/16"'
      },
      incidents: {
        droppedBrackets: droppedTeeth,
        chargeDroppedBrackets: chargeDropped,
        droppedBracketCostUSD: droppedCost,
        debondedTubes: [],
        distalWireCutDone: true
      },
      hygiene: hygieneStatus,
      notes: visitNotes,
      chargeSentToCashier: false,
      amountChargedUSD: totalChargeUSD
    };

    const updatedCase: OrthodonticCase = {
      ...orthoCase,
      doctorId: activeDoctor?.id || orthoCase.doctorId,
      doctorName: activeDoctor?.name || orthoCase.doctorName,
      doctorCommissionPercent: activeDoctor?.commissionPercent || orthoCase.doctorCommissionPercent,
      visits: [newVisit, ...(orthoCase.visits || [])]
    };

    await handleSaveCase(updatedCase);
    setIsAddingVisit(false);
    setDroppedTeeth([]);
    setVisitNotes('');
  };

  const handleSendVisitToCashier = async (visit: OrthodonticVisit) => {
    if (!orthoCase) return;
    setIsSendingCashier(true);
    try {
      const items = [
        {
          procedureName: `Control de Ortodoncia / Activación Mes #${visit.sessionNumber}`,
          toothNum: 'General',
          cost: orthoCase.monthlyFeeUSD || 35.0
        }
      ];

      if (visit.incidents.chargeDroppedBrackets && visit.incidents.droppedBrackets.length > 0) {
        items.push({
          procedureName: `Reposición de Bracket Caído (${visit.incidents.droppedBrackets.join(', ')})`,
          toothNum: visit.incidents.droppedBrackets.join(', '),
          cost: visit.incidents.droppedBracketCostUSD
        });
      }

      const total = items.reduce((sum, item) => sum + item.cost, 0);

      const activeDoctor = dentalStaff.find(d => d.id === (visit.doctorId || selectedDoctorId));
      const res = await sendDentalOrderToCashierAction(
        patientId,
        patientName,
        items,
        total,
        tenantId,
        effectiveActor,
        activeDoctor ? {
          doctorId: activeDoctor.id,
          doctorName: activeDoctor.name,
          doctorCommissionPercent: activeDoctor.commissionPercent
        } : undefined
      );

      if (res.success) {
        // Marcar visita como enviada a caja
        const updatedVisits = orthoCase.visits.map(v => 
          v.id === visit.id ? { ...v, chargeSentToCashier: true } : v
        );
        await handleSaveCase({ ...orthoCase, visits: updatedVisits });

        toast({
          variant: 'success',
          title: 'Orden enviada a Caja POS',
          description: `Orden #${res.documentNumber} generada por $${total.toFixed(2)} USD. Lista para cobrar en mostrador.`,
        });
      } else {
        toast({
          variant: 'error',
          title: 'Error al despachar a caja',
          description: res.error || 'No se pudo generar la orden.',
        });
      }
    } catch {
      toast({
        variant: 'error',
        title: 'Error de conexión',
        description: 'Fallo al comunicarse con la caja registradora.',
      });
    } finally {
      setIsSendingCashier(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="animate-spin mr-2" size={20} />
        <span>Cargando expediente de ortodoncia...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarjeta de Parámetros del Tratamiento */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-foreground text-base tracking-tight">Expediente de Ortodoncia & Brackets</h3>
              <p className="text-xs text-slate-500">Planificación biomecánica, control de arcos y mensualidades</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => orthoCase && handleSaveCase(orthoCase)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-foreground transition-all flex items-center gap-1.5 btn-haptic"
            >
              <Save size={14} />
              <span>Guardar Caso</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingVisit(!isAddingVisit)}
              className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
            >
              <Plus size={14} />
              <span>Nueva Activación</span>
            </button>
          </div>
        </div>

        {orthoCase && (
          <div className="space-y-3">
            {/* Selector de Especialista Tratante */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-foreground">Ortodoncista Tratante:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    const doc = dentalStaff.find(d => d.id === e.target.value);
                    if (doc) {
                      setOrthoCase({
                        ...orthoCase,
                        doctorId: doc.id,
                        doctorName: doc.name,
                        doctorCommissionPercent: doc.commissionPercent
                      });
                    }
                  }}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground"
                >
                  {dentalStaff.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.avatar} {doc.name} ({doc.role} — {doc.commissionPercent}% honorarios)
                    </option>
                  ))}
                </select>
                {selectedDoctorId && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    Honorario: {dentalStaff.find(d => d.id === selectedDoctorId)?.commissionPercent || 50}%
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Técnica / Brackets</label>
                <select
                  value={orthoCase.technique}
                  onChange={(e) => setOrthoCase({ ...orthoCase, technique: e.target.value as OrthoTechnique })}
                  className="w-full bg-background border border-border rounded-xl px-2.5 py-2 font-medium text-foreground focus:ring-2 focus:ring-primary/20"
                >
                  <option value="metal_roth">Metálicos Roth .022</option>
                  <option value="metal_mbt">Metálicos MBT .022</option>
                  <option value="esthetic_sapphire">Estéticos Cristal de Zafiro</option>
                  <option value="ceramic">Cerámicos Policristalinos</option>
                  <option value="self_ligating_damon">Autoligables Pasivos (Damon)</option>
                  <option value="lingual">Ortodoncia Lingual</option>
                  <option value="clear_aligners">Alineadores Transparentes</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Maloclusión (Angle)</label>
                <select
                  value={orthoCase.angleClassification}
                  onChange={(e) => setOrthoCase({ ...orthoCase, angleClassification: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-xl px-2.5 py-2 font-medium text-foreground focus:ring-2 focus:ring-primary/20"
                >
                  <option value="class_I">Clase I (Normoclusión molar)</option>
                  <option value="class_II_div_1">Clase II División 1</option>
                  <option value="class_II_div_2">Clase II División 2</option>
                  <option value="class_III">Clase III (Prognatismo)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Mensualidad Pactada</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={orthoCase.monthlyFeeUSD}
                    onChange={(e) => setOrthoCase({ ...orthoCase, monthlyFeeUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-background border border-border rounded-xl pl-6 pr-2.5 py-2 font-black text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Reposición por Bracket</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={orthoCase.bracketReplacementFeeUSD}
                    onChange={(e) => setOrthoCase({ ...orthoCase, bracketReplacementFeeUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-background border border-border rounded-xl pl-6 pr-2.5 py-2 font-black text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulario Desplegable: Registrar Control Mensual */}
      {isAddingVisit && (
        <div className="bg-amber-500/5 dark:bg-amber-950/20 border-2 border-amber-500/30 rounded-2xl p-5 space-y-5 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" />
              <span>Registrar Cita de Activación / Control Mensual</span>
            </h4>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
              Visita #{(orthoCase?.visits?.length || 0) + 1}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arcada Superior */}
            <div className="bg-background border border-border rounded-xl p-4 space-y-3">
              <span className="text-xs font-black text-primary uppercase tracking-wider">Arcada Superior</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Material del Arco</label>
                  <select
                    value={upperMaterial}
                    onChange={(e) => setUpperMaterial(e.target.value as WireMaterial)}
                    className="w-full bg-card border border-border rounded-lg p-2 text-foreground font-medium"
                  >
                    <option value="niti_thermal">NiTi Térmico</option>
                    <option value="niti_superelastic">NiTi Superelástico</option>
                    <option value="stainless_steel">Acero Inoxidable</option>
                    <option value="tma_beta_ti">TMA / Beta-Titanio</option>
                    <option value="none">Sin Arco</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Calibre</label>
                  <select
                    value={upperSize}
                    onChange={(e) => setUpperSize(e.target.value as WireSize)}
                    className="w-full bg-card border border-border rounded-lg p-2 text-foreground font-medium"
                  >
                    <option value=".012">.012 (Alineación inicial)</option>
                    <option value=".014">.014</option>
                    <option value=".016">.016</option>
                    <option value=".018">.018</option>
                    <option value=".016x.016">.016 x .016</option>
                    <option value=".016x.022">.016 x .022</option>
                    <option value=".017x.025">.017 x .025</option>
                    <option value=".019x.025">.019 x .025 (Cierre de espacios)</option>
                  </select>
                </div>
              </div>

              {/* Selector de Color de Gomitas */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1 flex items-center gap-1">
                  <Palette size={12} />
                  <span>Color de Ligaduras (Elegido por el paciente): <strong>{upperColor.name}</strong></span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ELASTIC_COLORS.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setUpperColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${upperColor.name === c.name ? 'scale-125 border-primary shadow-xs' : 'border-border/50'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Arcada Inferior */}
            <div className="bg-background border border-border rounded-xl p-4 space-y-3">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Arcada Inferior</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Material del Arco</label>
                  <select
                    value={lowerMaterial}
                    onChange={(e) => setLowerMaterial(e.target.value as WireMaterial)}
                    className="w-full bg-card border border-border rounded-lg p-2 text-foreground font-medium"
                  >
                    <option value="niti_thermal">NiTi Térmico</option>
                    <option value="niti_superelastic">NiTi Superelástico</option>
                    <option value="stainless_steel">Acero Inoxidable</option>
                    <option value="tma_beta_ti">TMA / Beta-Titanio</option>
                    <option value="none">Sin Arco</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Calibre</label>
                  <select
                    value={lowerSize}
                    onChange={(e) => setLowerSize(e.target.value as WireSize)}
                    className="w-full bg-card border border-border rounded-lg p-2 text-foreground font-medium"
                  >
                    <option value=".012">.012 (Alineación inicial)</option>
                    <option value=".014">.014</option>
                    <option value=".016">.016</option>
                    <option value=".018">.018</option>
                    <option value=".016x.016">.016 x .016</option>
                    <option value=".016x.022">.016 x .022</option>
                    <option value=".017x.025">.017 x .025</option>
                    <option value=".019x.025">.019 x .025 (Cierre de espacios)</option>
                  </select>
                </div>
              </div>

              {/* Selector de Color de Gomitas */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1 flex items-center gap-1">
                  <Palette size={12} />
                  <span>Color de Ligaduras: <strong>{lowerColor.name}</strong></span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ELASTIC_COLORS.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setLowerColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${lowerColor.name === c.name ? 'scale-125 border-primary shadow-xs' : 'border-border/50'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Elásticos Intermaxilares e Incidencias (Brackets Caídos) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background border border-border rounded-xl p-4 text-xs">
            <div className="space-y-3">
              <span className="font-bold text-foreground block">Elásticos Intermaxilares</span>
              <select
                value={elasticVector}
                onChange={(e) => setElasticVector(e.target.value as any)}
                className="w-full bg-card border border-border rounded-lg p-2 text-foreground font-medium"
              >
                <option value="none">Sin elásticos esta sesión</option>
                <option value="class_II">Vector Clase II (Canino sup a 1er molar inf)</option>
                <option value="class_III">Vector Clase III (1er molar sup a canino inf)</option>
                <option value="box_anterior">Caja anterior (Cierre de mordida abierta)</option>
                <option value="triangular">Asentamiento oclusal triangular</option>
                <option value="midline">Corrección de Línea Media</option>
              </select>

              <div className="pt-2">
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Índice de Higiene Dental</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHygieneStatus('excellent')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${hygieneStatus === 'excellent' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600' : 'border-border text-slate-500'}`}
                  >
                    Excelente
                  </button>
                  <button
                    type="button"
                    onClick={() => setHygieneStatus('good')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${hygieneStatus === 'good' ? 'bg-blue-500/20 border-blue-500 text-blue-600' : 'border-border text-slate-500'}`}
                  >
                    Bueno
                  </button>
                  <button
                    type="button"
                    onClick={() => setHygieneStatus('poor_warning')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${hygieneStatus === 'poor_warning' ? 'bg-rose-500/20 border-rose-500 text-rose-600' : 'border-border text-slate-500'}`}
                  >
                    Deficiente ⚠️
                  </button>
                </div>
              </div>
            </div>

            {/* Brackets Caídos / Despegados */}
            <div className="space-y-3">
              <span className="font-bold text-foreground block">Incidencias: Brackets Despegados</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Pieza FDI (ej. 13, 22)"
                  value={droppedBracketInput}
                  onChange={(e) => setDroppedBracketInput(e.target.value)}
                  className="w-32 bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddDroppedTooth}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold text-foreground"
                >
                  Agregar
                </button>
              </div>

              {droppedTeeth.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {droppedTeeth.map(tooth => (
                    <span key={tooth} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 font-mono text-xs font-bold">
                      Diente {tooth}
                      <button type="button" onClick={() => handleRemoveDroppedTooth(tooth)} className="hover:text-rose-800">×</button>
                    </span>
                  ))}
                </div>
              )}

              {droppedTeeth.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={chargeDropped}
                    onChange={(e) => setChargeDropped(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-xs font-bold text-foreground">
                    Cobrar reposición en caja (${(droppedTeeth.length * (orthoCase?.bracketReplacementFeeUSD || 10)).toFixed(2)} USD)
                  </span>
                </label>
              )}
            </div>
          </div>

          <div>
            <textarea
              placeholder="Notas clínicas de la activación (ej. 'Se colocó cadeneta de premolar a premolar para cierre de diastema. Elásticos 3/16 uso 24h')."
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:ring-2 focus:ring-primary/20 resize-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingVisit(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegisterVisit}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all btn-haptic shadow-xs flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Guardar Control</span>
            </button>
          </div>
        </div>
      )}

      {/* Historial de Citas de Activación de Ortodoncia */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <h4 className="font-extrabold text-foreground text-sm tracking-tight flex items-center justify-between">
          <span>Bitácora de Activaciones & Ajustes</span>
          <span className="text-xs font-bold text-slate-400">Total: {orthoCase?.visits?.length || 0} controles</span>
        </h4>

        {(!orthoCase?.visits || orthoCase.visits.length === 0) ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Aún no hay controles de activación registrados para este paciente. Presiona &quot;Nueva Activación&quot; para registrar el primer cambio de arcos y ligaduras.
          </div>
        ) : (
          <div className="space-y-3">
            {orthoCase.visits.map((visit) => (
              <div
                key={visit.id}
                className="p-4 rounded-xl border border-border/80 bg-background hover:border-border transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-black text-xs">
                      Sesión #{visit.sessionNumber}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(visit.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-slate-400">• Por {visit.performer}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-foreground">
                      ${visit.amountChargedUSD?.toFixed(2)} USD
                    </span>

                    {visit.chargeSentToCashier ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        <CheckCircle2 size={12} />
                        Enviado a Caja
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isSendingCashier}
                        onClick={() => handleSendVisitToCashier(visit)}
                        className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1 rounded-lg transition-all btn-haptic"
                        title="Enviar cuota mensual de ortodoncia a Caja POS"
                      >
                        <Send size={11} />
                        Cobrar en Caja
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Arco Superior</span>
                    <span className="font-semibold text-foreground">
                      {visit.archUpper?.wireMaterial.replace('_', ' ')} {visit.archUpper?.wireSize}
                    </span>
                    <span className="inline-block w-2.5 h-2.5 rounded-full ml-1.5 align-middle border border-border" style={{ backgroundColor: visit.archUpper?.colorHex }} />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Arco Inferior</span>
                    <span className="font-semibold text-foreground">
                      {visit.archLower?.wireMaterial.replace('_', ' ')} {visit.archLower?.wireSize}
                    </span>
                    <span className="inline-block w-2.5 h-2.5 rounded-full ml-1.5 align-middle border border-border" style={{ backgroundColor: visit.archLower?.colorHex }} />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Elásticos</span>
                    <span className="font-semibold text-foreground">{visit.elastics?.vector || 'Ninguno'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Incidencias</span>
                    {visit.incidents?.droppedBrackets?.length > 0 ? (
                      <span className="text-rose-500 font-bold">
                        {visit.incidents.droppedBrackets.length} bracket(s) despegado(s)
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-bold">Aparatos intactos</span>
                    )}
                  </div>
                </div>

                {visit.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg italic">
                    &quot;{visit.notes}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
