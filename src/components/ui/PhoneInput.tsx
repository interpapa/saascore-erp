'use client';

import React, { useState } from 'react';
import { Phone, ChevronDown } from 'lucide-react';

export interface CountryCode {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
}

export const COUNTRIES: CountryCode[] = [
  { code: 'VE', dialCode: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'CO', dialCode: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', name: 'México' },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'España' },
  { code: 'CL', dialCode: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: 'AR', dialCode: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'PE', dialCode: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: 'EC', dialCode: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: 'DO', dialCode: '+1-809', flag: '🇩🇴', name: 'Rep. Dominicana' },
  { code: 'PA', dialCode: '+507', flag: '🇵🇦', name: 'Panamá' },
];

export interface PhoneInputProps {
  label?: string;
  value?: string;
  onChange: (fullPhoneNumber: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  name?: string;
}

export function PhoneInput({
  label = 'Teléfono',
  value = '',
  onChange,
  placeholder = '412 1234567',
  required = false,
  className = '',
  disabled = false,
  name = 'phone'
}: PhoneInputProps) {
  const detectInitialCountry = () => {
    if (!value) return COUNTRIES[0]; // Venezuela (+58) por defecto
    const matched = COUNTRIES.find(c => value.startsWith(c.dialCode));
    return matched || COUNTRIES[0];
  };

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(detectInitialCountry);
  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    if (!value) return '';
    const matched = COUNTRIES.find(c => value.startsWith(c.dialCode));
    if (matched) {
      return value.replace(matched.dialCode, '').trim();
    }
    return value;
  });

  // Sincronización de valor externo eliminada; el componente gestiona su propio estado interno.


  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = COUNTRIES.find(c => c.code === e.target.value) || COUNTRIES[0];
    setSelectedCountry(country);
    const fullNumber = phoneNumber ? `${country.dialCode} ${phoneNumber}` : '';
    onChange(fullNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawNumber = e.target.value;
    setPhoneNumber(rawNumber);
    const fullNumber = rawNumber.trim() ? `${selectedCountry.dialCode} ${rawNumber.trim()}` : '';
    onChange(fullNumber);
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5 font-sans">
          <Phone size={14} className="text-slate-400" />
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all overflow-hidden">
        {/* Selector de País con Bandera */}
        <div className="relative flex items-center pl-3 pr-2 py-2 border-r border-border bg-slate-50 dark:bg-slate-900/50 text-xs font-bold shrink-0">
          <span className="text-base mr-1.5 select-none">{selectedCountry.flag}</span>
          <span className="text-foreground font-mono mr-1">{selectedCountry.dialCode}</span>
          <ChevronDown size={12} className="text-slate-400" />

          <select
            value={selectedCountry.code}
            onChange={handleCountryChange}
            disabled={disabled}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Seleccionar País"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.dialCode})
              </option>
            ))}
          </select>
        </div>

        {/* Input para el Número Local */}
        <input
          type="tel"
          name={name}
          value={phoneNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-slate-400 focus:outline-none font-sans"
        />
      </div>
    </div>
  );
}
