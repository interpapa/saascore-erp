'use client';

import React, { useState, useEffect } from 'react';
import { pluginManager } from '@/lib/core/plugins/pluginManager';
import { initializePlugins } from '@/lib/core/plugins/pluginRegistry';
import { Blocks, CheckCircle2, XCircle, ShieldCheck, Cpu, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PluginsConfigPage() {
  const [plugins, setPlugins] = useState<unknown[]>([]);

  useEffect(() => {
    initializePlugins();
    loadPlugins();
  }, []);

  const loadPlugins = () => {
    const registered = pluginManager.getRegisteredPlugins();
    setPlugins(registered);
  };

  const togglePlugin = async (id: string, currentEnabled: boolean) => {
    const registered = pluginManager.getRegisteredPlugins();
    const plugin = registered.find((p) => p.id === id);
    if (!plugin) return;

    if (currentEnabled) {
      await pluginManager.unregisterPlugin(id);
    } else {
      // Re-enable
      await pluginManager.registerPlugin({
        ...plugin,
        enabled: true,
      } as any);
    }
    loadPlugins();
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Link 
              href="/configuracion" 
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Blocks className="w-7 h-7 text-indigo-400" />
              Gestor de Plugins y Extensiones
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1 ml-11">
            Administra los módulos de la comunidad, motores de impuestos localizados y extensiones de UI.
          </p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Cpu className="w-4 h-4" />
          <span>Arquitectura Extensible v1.0</span>
        </div>
      </div>

      {/* Grid of Plugins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            className={`p-6 rounded-xl border transition-all ${
              plugin.enabled
                ? 'bg-slate-900/80 border-slate-700/80 shadow-lg'
                : 'bg-slate-950/40 border-slate-800/60 opacity-70'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg text-white">{plugin.name}</h3>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    v{plugin.version}
                  </span>
                </div>
                <p className="text-xs text-indigo-400 font-medium">Por: {plugin.author}</p>
              </div>

              <button
                onClick={() => togglePlugin(plugin.id, plugin.enabled)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  plugin.enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {plugin.enabled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Activo</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-slate-500" />
                    <span>Inactivo</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed">{plugin.description}</p>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Auditable e Inmutable</span>
              </div>
              <span className="font-mono text-slate-500">{plugin.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
