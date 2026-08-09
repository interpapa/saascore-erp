'use client';

import { useState, useEffect } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { updateTenantSettings } from '@/app/actions/tenant';
import { ArrowLeft, Save, Building2, Globe, Image as ImageIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ConfiguracionPage() {
  const { currentTenant, setCurrentTenant } = useERPStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    currency: 'USD',
    language: 'es',
    logo_url: ''
  });

  useEffect(() => {
    if (currentTenant) {
      setFormData({
        name: currentTenant.name || '',
        currency: currentTenant.metadata?.currency || 'USD',
        language: currentTenant.metadata?.language || 'es',
        logo_url: currentTenant.metadata?.logo_url || ''
      });
    }
  }, [currentTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const metadata = {
        ...currentTenant.metadata,
        currency: formData.currency,
        language: formData.language,
        logo_url: formData.logo_url
      };

      const result = await updateTenantSettings(currentTenant.id, formData.name, metadata);
      
      if (!result.success) throw new Error(result.error);

      // Actualizar estado local inmediatamente para reflejar cambios en toda la app
      setCurrentTenant({
        ...currentTenant,
        name: formData.name,
        metadata
      });

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Ajustes del Sistema</h1>
        <p className="text-slate-500 font-medium mt-1 mb-8">Personaliza la configuración de tu instancia de negocio</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Alertas */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-2xl flex items-center gap-3">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}
        {isSuccess && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={18} />
            Configuración guardada exitosamente
          </div>
        )}

        {/* Sección: Perfil de Empresa */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 size={16} />
            </div>
            Perfil de Empresa
          </h2>
          
          <div className="space-y-5">
            <Input
              label="Nombre del Negocio"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              icon={<Building2 size={18} />}
              required
            />

            <Input
              label="URL del Logo (Opcional)"
              placeholder="https://ejemplo.com/logo.png"
              value={formData.logo_url}
              onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
              icon={<ImageIcon size={18} />}
            />
            {formData.logo_url && (
              <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-border flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vista Previa</span>
              </div>
            )}
          </div>
        </div>

        {/* Sección: Preferencias Regionales */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Globe size={16} />
            </div>
            Preferencias Regionales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Moneda Principal</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
              >
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="MXN">Peso Mexicano (MXN)</option>
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="VES">Bolívar (VES)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Idioma del Sistema</label>
              <select
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" isLoading={isLoading} className="w-full md:w-auto px-8 bg-primary hover:bg-primary/90 text-primary-foreground btn-haptic">
            <Save size={18} className="mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
