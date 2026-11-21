'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useERPStore, Tenant } from '@/store/useERPStore';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { Building2, ChevronDown, Check, LogOut, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function TenantSwitcher() {
  const session = useERPStore(s => s.session);
  const currentTenant = useERPStore(s => s.currentTenant);
  const impersonatedTenant = useERPStore(s => s.impersonatedTenant);
  const impersonateTenant = useERPStore(s => s.impersonateTenant);
  const stopImpersonation = useERPStore(s => s.stopImpersonation);

  const [isOpen, setIsOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuper = session?.role === 'superadmin' && isSuperAdminEmail(session?.userEmail);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar lista de empresas disponibles para el selector
  useEffect(() => {
    if (!isSuper) return;
    let isMounted = true;

    async function loadTenants() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, status, is_active, active_modules, metadata')
          .order('name', { ascending: true });

        if (!error && data && isMounted) {
          setTenants(data);
        }
      } catch (err) {
        console.warn('[TenantSwitcher] Error cargando empresas:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTenants();
    return () => { isMounted = false; };
  }, [isSuper]);

  if (!isSuper) return null;

  const handleSelectTenant = (tenant: any) => {
    impersonateTenant({
      id: tenant.id,
      name: tenant.name,
      blocked: tenant.status === 'suspended',
      active_modules: tenant.active_modules,
      metadata: tenant.metadata,
    });
    setIsOpen(false);
    // Recarga suave para garantizar que todas las suites y Server Actions refresquen datos del nuevo tenant
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleResetToOwn = () => {
    stopImpersonation();
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const displayName = currentTenant?.name || 'Seleccionar Negocio';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs btn-haptic ${
          impersonatedTenant
            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
            : 'bg-card hover:bg-accent text-foreground border-border'
        }`}
        title="Cambiar de Empresa / Negocio"
      >
        <Building2 size={14} className={impersonatedTenant ? 'text-amber-500 animate-pulse' : 'text-primary'} />
        <span className="max-w-[130px] truncate">{displayName}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 text-muted-foreground ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 animate-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-border mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              Cambiar de Negocio
            </span>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {tenants.length} empresas
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Cargando empresas...
              </div>
            ) : tenants.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No se encontraron empresas
              </div>
            ) : (
              tenants.map((t) => {
                const isSelected = currentTenant?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTenant(t)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <p className="truncate">{t.name}</p>
                      {t.metadata?.owner_email && (
                        <p className={`text-[10px] truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {t.metadata.owner_email}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {impersonatedTenant && (
            <div className="mt-2 pt-2 border-t border-border">
              <button
                onClick={handleResetToOwn}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
              >
                <LogOut size={13} />
                Volver a mi empresa base (rendo corp)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
