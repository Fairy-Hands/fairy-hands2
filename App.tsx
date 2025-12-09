import { useState, useEffect } from 'react';
import { AppView, Product, Sale, CartItem } from './types';
import { LayoutDashboard, Store, Package, Sparkles, Menu, LogOut, Candy, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { POS } from './POS';
import { Inventory } from './Inventory';
import { Dashboard } from './Dashboard';
import { getStoreInsights } from './geminiService';
import { fetchProducts, fetchSales, saveProduct, deleteProductRemote, saveSale, updateStockBatch, updateSalePayment } from './dataService';
import { isCloudEnabled } from './supabaseClient';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.POS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // AI State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [loadedProducts, loadedSales] = await Promise.all([
          fetchProducts(),
          fetchSales()
        ]);
        setProducts(loadedProducts);
        setSales(loadedSales);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Sync to LocalStorage if NOT cloud (Backup safety)
  useEffect(() => {
    if (!isCloudEnabled) {
      localStorage.setItem('docegestao_products', JSON.stringify(products));
      localStorage.setItem('docegestao_sales', JSON.stringify(sales));
    }
  }, [products, sales]);

  // Handlers
  const handleAddProduct = async (product: Product) => {
    const newProducts = [...products, product];
    setProducts(newProducts); // Optimistic update
    await saveProduct(product, false);
  };
  
  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p)); // Optimistic
    await saveProduct(updatedProduct, true);
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts(products.filter(p => p.id !== id)); // Optimistic
    await deleteProductRemote(id);
  };

  const handleCompleteSale = async (items: CartItem[], method: 'cash' | 'card' | 'pix' | 'pending' | 'ifood', observation?: string, deliveryCost?: number) => {
    const productsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const delivery = deliveryCost || 0;
    const total = productsTotal + delivery;
    
    // Append delivery cost to observation to save in DB without schema change
    let finalObs = observation || '';
    if (delivery > 0) {
      const deliveryText = `[Entrega: R$ ${delivery.toFixed(2)}]`;
      finalObs = finalObs ? `${finalObs} ${deliveryText}` : deliveryText;
    }

    const newSale: Sale = {
      id: crypto.randomUUID(),
      items,
      total,
      date: new Date().toISOString(),
      paymentMethod: method,
      observation: finalObs
    };

    setSales([...sales, newSale]); // Optimistic Sales Update

    // Update Stock Logic
    const stockUpdates: {id: string, newStock: number}[] = [];
    const updatedProducts = products.map(product => {
      const soldItem = items.find(i => i.id === product.id);
      if (soldItem) {
        const newStock = product.stock - soldItem.quantity;
        stockUpdates.push({ id: product.id, newStock });
        return { ...product, stock: newStock };
      }
      return product;
    });
    setProducts(updatedProducts); // Optimistic Stock Update

    // Persist to Cloud/DB
    await saveSale(newSale);
    await updateStockBatch(stockUpdates);
  };

  const handleResolvePendingSale = async (saleId: string, method: 'cash' | 'card' | 'pix' | 'ifood') => {
    // 1. Update local state immediately (Optimistic UI)
    const updatedSales = sales.map(s => 
      s.id === saleId ? { ...s, paymentMethod: method } : s
    );
    setSales(updatedSales);

    // 2. Update DB
    await updateSalePayment(saleId, method);
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    const response = await getStoreInsights(products, sales, aiQuery);
    setAiResponse(response);
    setAiLoading(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
        ${currentView === view 
          ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' 
          : 'text-gray-500 hover:bg-rose-50 hover:text-rose-600'}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-rose-500 gap-4">
        <Loader2 size={48} className="animate-spin" />
        <p className="font-medium text-gray-600">Carregando sua loja...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-40 w-64 h-full bg-white border-r border-gray-100 flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500 p-2 rounded-lg text-white">
              <Candy size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 leading-tight">DoceGestão</h1>
              <div className="flex items-center gap-1 mt-1">
                {isCloudEnabled ? (
                  <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Cloud size={10} /> Online
                  </span>
                ) : (
                   <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <CloudOff size={10} /> Local
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem view={AppView.POS} icon={Store} label="Caixa / Vendas" />
          <NavItem view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={AppView.INVENTORY} icon={Package} label="Estoque" />
          <NavItem view={AppView.AI_ASSISTANT} icon={Sparkles} label="Consultor IA" />
        </nav>

        <div className="p-4 border-t border-gray-50">
          <button className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 w-full transition-colors rounded-xl hover:bg-red-50">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden relative w-full">
        {currentView === AppView.POS && (
          <POS products={products} onCompleteSale={handleCompleteSale} />
        )}

        {currentView === AppView.INVENTORY && (
          <Inventory 
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {currentView === AppView.DASHBOARD && (
          <Dashboard 
            sales={sales} 
            products={products} 
            onResolvePending={handleResolvePendingSale}
          />
        )}

        {currentView === AppView.AI_ASSISTANT && (
          <div className="p-6 h-full flex flex-col max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Sparkles className="text-rose-500" />
                Consultor Inteligente
              </h2>
              <p className="text-gray-500">Pergunte sobre seus dados de vendas, sugestões de estoque ou ideias de marketing.</p>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto mb-6">
              {aiResponse ? (
                <div className="prose prose-rose max-w-none">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Resposta da IA</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">{aiResponse}</div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center">
                  <Sparkles size={48} className="mb-4 opacity-50" />
                  <p>Aguardando sua pergunta...</p>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-2">
              <input 
                type="text" 
                className="flex-1 p-3 bg-gray-50 rounded-lg border-transparent focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                placeholder="Ex: Qual doce vendeu mais hoje? O que devo repor?"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              />
              <button 
                onClick={handleAskAI}
                disabled={aiLoading}
                className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={20} /> <span className="hidden sm:inline">Perguntar</span></>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;