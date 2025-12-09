import React, { useState, useMemo } from 'react';
import { Sale, Product } from './types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Package, DollarSign, ShoppingBag, Clock, User, Calendar, Filter, CreditCard, Banknote, QrCode, AlertTriangle, ArrowRight, CheckCircle, Bike } from 'lucide-react';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  onResolvePending?: (saleId: string, method: 'cash' | 'card' | 'pix' | 'ifood') => void;
}

type DateRange = 'today' | 'week' | 'month' | 'all';
type PaymentFilter = 'all' | 'cash' | 'card' | 'pix' | 'ifood' | 'pending';

// Configuração do limite de alerta (pode ser tornado dinâmico via props no futuro)
const LOW_STOCK_COUNT_THRESHOLD = 5;

export const Dashboard: React.FC<DashboardProps> = ({ sales, products, onResolvePending }) => {
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // --- Filtering Logic ---
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();

    return sales.filter(sale => {
      const saleDate = new Date(sale.date).getTime();
      let dateMatch = true;
      let paymentMatch = true;

      // Date Filter
      if (dateRange === 'today') dateMatch = saleDate >= todayStart;
      else if (dateRange === 'week') dateMatch = saleDate >= weekStart;
      else if (dateRange === 'month') dateMatch = saleDate >= monthStart;
      
      // Payment Filter
      if (paymentFilter !== 'all') paymentMatch = sale.paymentMethod === paymentFilter;

      return dateMatch && paymentMatch;
    });
  }, [sales, dateRange, paymentFilter]);

  // --- Stats Calculation based on FILTERED data ---
  const totalRevenue = filteredSales
    .filter(s => s.paymentMethod !== 'pending')
    .reduce((acc, sale) => acc + sale.total, 0);
  
  const pendingRevenue = filteredSales
    .filter(s => s.paymentMethod === 'pending')
    .reduce((acc, sale) => acc + sale.total, 0);

  const totalSalesCount = filteredSales.length;
  const lowStockProducts = products.filter(p => p.stock < 5).length;
  
  // Verifica se deve exibir o alerta
  const showStockAlert = lowStockProducts >= LOW_STOCK_COUNT_THRESHOLD;

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
    if (dateRange === 'today') {
      // Group by Hour for "Today"
      const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 to 21:00
      return hours.map(hour => {
        const hourSales = filteredSales.filter(s => {
          const d = new Date(s.date);
          return d.getHours() === hour;
        });
        return {
          name: `${hour}h`,
          vendas: hourSales.reduce((acc, s) => acc + s.total, 0)
        };
      });
    } else {
      // Group by Day for Week/Month/All
      const daysMap = new Map<string, number>();
      
      // Initialize keys based on range to ensure continuity in chart
      const daysToGenerate = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 0;
      
      if (daysToGenerate > 0) {
        for (let i = daysToGenerate - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          daysMap.set(key, 0);
        }
      }

      // Fill with actual data
      filteredSales.forEach(sale => {
        const d = new Date(sale.date);
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        // If 'all', we might need to add keys dynamically if not initialized
        const current = daysMap.get(key) || 0;
        daysMap.set(key, current + sale.total);
      });

      // Convert Map to Array and Sort (if 'all' range, sorting is needed)
      return Array.from(daysMap.entries()).map(([name, vendas]) => ({ name, vendas }));
    }
  }, [filteredSales, dateRange]);

  // --- Helpers ---
  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'pix': return 'PIX';
      case 'ifood': return 'iFood';
      case 'pending': return 'Pendente';
      default: return method;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'ifood': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'pix': return 'text-teal-600 bg-teal-50';
      case 'card': return 'text-blue-600 bg-blue-50';
      case 'cash': return 'text-green-600 bg-green-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full pb-20">
      
      {/* Alerta de Estoque Crítico */}
      {showStockAlert && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full text-red-600 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-red-900 text-lg">Atenção: Nível de Estoque Crítico</h3>
              <p className="text-red-700">
                Você possui <span className="font-bold">{lowStockProducts} produtos</span> com estoque baixo (menos de 5 unidades).
                É recomendável repor o estoque em breve.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        
        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Date Filter */}
          <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
            {(['today', 'week', 'month', 'all'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  dateRange === r 
                    ? 'bg-rose-500 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {r === 'today' && 'Hoje'}
                {r === 'week' && '7 Dias'}
                {r === 'month' && '30 Dias'}
                {r === 'all' && 'Tudo'}
              </button>
            ))}
          </div>

          {/* Payment Filter */}
          <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm overflow-x-auto">
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                paymentFilter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            <button onClick={() => setPaymentFilter('cash')} className={`px-2 py-1.5 rounded-md transition-all ${paymentFilter === 'cash' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-green-600'}`}><Banknote size={16}/></button>
            <button onClick={() => setPaymentFilter('card')} className={`px-2 py-1.5 rounded-md transition-all ${paymentFilter === 'card' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-blue-600'}`}><CreditCard size={16}/></button>
            <button onClick={() => setPaymentFilter('pix')} className={`px-2 py-1.5 rounded-md transition-all ${paymentFilter === 'pix' ? 'bg-teal-100 text-teal-700' : 'text-gray-400 hover:text-teal-600'}`}><QrCode size={16}/></button>
            <button onClick={() => setPaymentFilter('ifood')} className={`px-2 py-1.5 rounded-md transition-all ${paymentFilter === 'ifood' ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:text-red-600'}`}><Bike size={16}/></button>
            <button onClick={() => setPaymentFilter('pending')} className={`px-2 py-1.5 rounded-md transition-all ${paymentFilter === 'pending' ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-amber-600'}`}><Clock size={16}/></button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <DollarSign size={100} />
          </div>
          <div className="p-3 bg-green-100 text-green-600 rounded-xl z-10">
            <DollarSign size={24} />
          </div>
          <div className="z-10">
            <p className="text-sm text-gray-500 font-medium">Faturamento (Recebido)</p>
            <p className="text-2xl font-bold text-gray-800">R$ {totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <Clock size={100} />
          </div>
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl z-10">
            <Clock size={24} />
          </div>
          <div className="z-10">
            <p className="text-sm text-gray-500 font-medium">A Receber (Pendente)</p>
            <p className="text-2xl font-bold text-gray-800">R$ {pendingRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Vendas no Período</p>
            <p className="text-2xl font-bold text-gray-800">{totalSalesCount}</p>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors ${showStockAlert ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
          <div className={`p-3 rounded-xl ${showStockAlert ? 'bg-red-200 text-red-700' : 'bg-rose-100 text-rose-600'}`}>
            <Package size={24} />
          </div>
          <div>
            <p className={`text-sm font-medium ${showStockAlert ? 'text-red-600' : 'text-gray-500'}`}>Estoque Baixo</p>
            <p className={`text-2xl font-bold ${showStockAlert ? 'text-red-800' : 'text-gray-800'}`}>{lowStockProducts} itens</p>
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Evolução de Vendas</h3>
            <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
              {dateRange === 'today' ? 'Por Hora' : 'Por Dia'}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                />
                <Line 
                  type="monotone" 
                  dataKey="vendas" 
                  stroke="#fb7185" 
                  strokeWidth={3} 
                  dot={{ fill: '#fb7185', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[400px]">
           <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
             <ShoppingBag size={18} className="text-rose-500"/>
             Histórico Filtrado
           </h3>
           <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {filteredSales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                <Filter size={32} className="mb-2 opacity-20" />
                <p className="text-sm">Nenhuma venda encontrada<br/>neste filtro.</p>
              </div>
            ) : (
              // Show last 50 filtered sales
              filteredSales.slice().reverse().slice(0, 50).map(sale => (
                <div key={sale.id} className="group flex flex-col p-3 border border-gray-50 hover:border-rose-100 hover:bg-rose-50/30 rounded-xl transition-all">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center text-gray-400 font-bold text-xs transition-colors">
                        {new Date(sale.date).getHours()}:{String(new Date(sale.date).getMinutes()).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">
                            {sale.items.reduce((acc, i) => acc + i.quantity, 0)} itens
                          </span>
                          {sale.observation && (
                            <span className="text-xs text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <User size={8} /> {sale.observation}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          {new Date(sale.date).toLocaleDateString()} • <span className={`uppercase font-semibold text-[10px] px-1 rounded ${getMethodColor(sale.paymentMethod)}`}>{getMethodLabel(sale.paymentMethod)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-bold ${sale.paymentMethod === 'pending' ? 'text-amber-500' : 'text-green-600'}`}>
                        +R$ {sale.total.toFixed(2)}
                      </span>
                      
                      {/* Resolve Button if Pending */}
                      {sale.paymentMethod === 'pending' && onResolvePending && (
                        <button 
                          onClick={() => setResolvingId(resolvingId === sale.id ? null : sale.id)}
                          className="mt-1 text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 hover:bg-amber-100 transition-colors"
                        >
                          <CheckCircle size={10} />
                          Receber
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Resolve Options */}
                  {resolvingId === sale.id && sale.paymentMethod === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                      <span className="text-xs text-gray-500 font-medium">Recebeu como?</span>
                      <button onClick={() => { onResolvePending?.(sale.id, 'cash'); setResolvingId(null); }} className="flex-1 bg-green-100 text-green-700 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors flex items-center justify-center gap-1">
                        <Banknote size={12}/> Dinheiro
                      </button>
                      <button onClick={() => { onResolvePending?.(sale.id, 'pix'); setResolvingId(null); }} className="flex-1 bg-teal-100 text-teal-700 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-200 transition-colors flex items-center justify-center gap-1">
                        <QrCode size={12}/> PIX
                      </button>
                      <button onClick={() => { onResolvePending?.(sale.id, 'card'); setResolvingId(null); }} className="flex-1 bg-blue-100 text-blue-700 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors flex items-center justify-center gap-1">
                        <CreditCard size={12}/> Cartão
                      </button>
                      <button onClick={() => { onResolvePending?.(sale.id, 'ifood'); setResolvingId(null); }} className="flex-1 bg-red-100 text-red-700 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-1">
                        <Bike size={12}/> iFood
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
           </div>
        </div>
      </div>
    </div>
  );
};