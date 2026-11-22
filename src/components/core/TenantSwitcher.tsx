'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useERPStore, Tenant } from '@/store/useERPStore';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { Building2, ChevronDown, Check, LogOut, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TenantSwitcherProps {
  variant?: 'header' | 'inline' | 'compact';
  className?: string;
}

export function TenantSwitcher({ variant = 'header', className = '' }: TenantSwitcherProps) {
  const session = useERPStore(s => s.session);
  const currentTenant = useERPStore(s => s.currentTenant);
  const impersonatedTenant = useERPStore(s => s.impersonatedTenant);
  const impersonateTenant = useERPStore(s => s.impersonateTenant);
  const stopImpersonation = useERPStore(s => s.stopImpersonation);
  const setCurrentTenant = useERPStore(s => s.setCurrentTenant);
  const setSession = useERPStore(s => s.setSession);

  const [isOpen, setIsOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuper = isSuperAdminEmail(session?.userEmail) || session?.role === 'superadmin';

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
    let isMounted = true;

    async function loadTenants() {
      if (!session?.userEmail) return;
      setIsLoading(true);
      try {
        if (isSuper) {
          // Superadmin: Cargar todas las empresas del sistema
          const { data, error } = await supabase
            .from('tenants')
            .select('id, name, status, is_active, active_modules, metadata')
            .order('name', { ascending: true });

          if (!error && data && isMounted) {
            setTenants(data);
          }
        } else {
          // Usuario regular: Cargar empresas donde está asignado
          const { data: utRows } = await supabase
            .from('user_tenants')
            .select('tenant_id, role')
            .ilike('user_email', session.userEmail);

          if (utRows && utRows.length > 0) {
            const tenantIds = utRows.map(r => r.tenant_id);
            const { data: userTenantsData } = await supabase
              .from('tenants')
              .select('id, name, status, is_active, active_modules, metadata')
              .in('id', tenantIds)
              .order('name', { ascending: true });

            if (userTenantsData && isMounted) {
              setTenants(userTenantsData);
            }
          }
        }
      } catch (err) {
        console.warn('[TenantSwitcher] Error cargando empresas:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTenants();
    return () => { isMounted = false; };
  }, [isSuper, session?.userEmail]);

  // Si no es superadmin y solo tiene 1 o 0 empresas, no mostramos el selector desplegable innecesario
  if (!isSuper && tenants.length <= 1) {
    if (variant === 'inline' && currentTenant?.name) {
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border ${className}`}>
          <Building2 size={13} className="text-primary" />
          <span className="truncate max-w-[150px]">{currentTenant.name}</span>
        </div>
      );
    }
    return null;
  }

  const handleSelectTenant = (tenant: any) => {
    const formattedTenant: Tenant = {
      id: tenant.id,
      name: tenant.name,
      blocked: tenant.status === 'suspended',
      active_modules: tenant.active_modules || (tenant.metadata as any)?.active_modules,
      metadata: tenant.metadata,
    };

    const isOwnBusiness = tenant.metadata?.owner_email && session?.userEmail && 
      tenant.metadata.owner_email.toLowerCase() === session.userEmail.toLowerCase();

    if (isSuper && !isOwnBusiness) {
      impersonateTenant(formattedTenant);
    } else {
      stopImpersonation();
      setCurrentTenant(formattedTenant);
      if (session) {
        setSession({
          ...session,
          tenantId: tenant.id,
        });
      }
    }
    setIsOpen(false);
    // Recarga para garantizar que todas las suites, vistas y Server Actions refresquen datos del nuevo tenant
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

  const isInline = variant === 'inline';

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-full text-xs font-bold transition-all border shadow-xs btn-haptic ${
          isInline
            ? 'px-3 py-1.5 bg-card hover:bg-accent text-foreground border-border/80 hover:border-primary/50'
            : impersonatedTenant
              ? 'px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
              : 'px-3 py-1.5 bg-card hover:bg-accent text-foreground border-border'
        }`}
        title="Cambiar de Empresa / Negocio"
      >
        <Building2
          size={14}
          className={
            impersonatedTenant
              ? 'text-amber-500 animate-pulse'
              : 'text-primary'
          }
        />
        <span className="max-w-[140px] truncate">{displayName}</span>
        {impersonatedTenant && (
          <span className="text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">
            Soporte
          </span>
        )}
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 text-muted-foreground ${isOpen ? 'rotate-180' : ''}`}
        />
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
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-primary" />
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
                    type="button"
                    onClick={() => handleSelectTenant(t)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <p className="truncate font-semibold">{t.name}</p>
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
                type="button"
                onClick={handleResetToOwn}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
              >
                <LogOut size={13} />
                Volver a mi empresa base
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
