"use client";

import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Store, MessageCircle, Info } from 'lucide-react';

export interface Item {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  stock_quantity: number;
  metadata: Record<string, unknown>;
}

export interface Tenant {
  id: string;
  name: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

interface CartItem extends Item {
  quantity: number;
}

export default function CatalogClient({ tenant, items }: { tenant: Tenant, items: Item[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  const categories = useMemo(() => {
    const cats = items.map(item => item.category).filter(Boolean);
    return Array.from(new Set(cats));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev[item.id];
      if (existing) {
        return { ...prev, [item.id]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return { ...prev, [item.id]: { ...item, quantity: 1 } };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.base_price * item.quantity), 0);
  const taxRate = 0;
  const total = subtotal * (1 + taxRate);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const handleWhatsAppOrder = () => {
    if (cartItems.length === 0) return;
    
    let message = `*Nuevo Pedido para ${tenant.name}*\n\n`;
    cartItems.forEach(item => {
      message += `${item.quantity}x ${item.name} - ${formatCurrency(item.base_price * item.quantity)}\n`;
    });
    message += `\n*Subtotal:* ${formatCurrency(subtotal)}\n`;
    message += `*Total:* ${formatCurrency(total)}\n`;
    
    const phone = tenant.phone || tenant.metadata?.phone || '';
    
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${phone}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
              {tenant.metadata?.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
<img src={tenant.metadata.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <Store size={20} />
              )}
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">{tenant.name}</h1>
              <p className="text-xs text-gray-500">Catálogo Digital</p>
            </div>
          </div>
          <button 
            onClick={() => window.open(`https://wa.me/${tenant.phone || tenant.metadata?.phone || ''}`, '_blank')}
            className="p-2 text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
          >
            <MessageCircle size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar productos..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-gray-900"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex overflow-x-auto space-x-2 pb-4 scrollbar-hide mb-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Info className="mx-auto text-gray-400 mb-3" size={32} />
            <h3 className="text-lg font-medium text-gray-900">No se encontraron productos</h3>
            <p className="text-gray-500">Intenta con otra búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map(item => {
              const qty = cart[item.id]?.quantity || 0;
              return (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex space-x-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center">
                      {item.metadata?.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
<img src={item.metadata.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Store className="text-gray-400" size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{item.description}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-bold text-gray-900">{formatCurrency(item.base_price)}</span>
                        {item.stock_quantity > 0 ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Stock: {item.stock_quantity}</span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Agotado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-end">
                    {qty === 0 ? (
                      <button 
                        onClick={() => addToCart(item)}
                        disabled={item.stock_quantity <= 0}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} className="mr-1" /> Agregar
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between bg-gray-50 rounded-xl p-1 border border-gray-200">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm text-gray-600 hover:text-indigo-600 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-medium text-gray-900">{qty}</span>
                        <button 
                          onClick={() => addToCart(item)}
                          disabled={qty >= item.stock_quantity}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm text-gray-600 hover:text-indigo-600 transition-colors disabled:opacity-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleWhatsAppOrder}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-between transition-transform transform active:scale-[0.98]"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-500/50 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  {totalItems}
                </div>
                <span>Ver Pedido en WhatsApp</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>{formatCurrency(total)}</span>
                <MessageCircle size={20} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
