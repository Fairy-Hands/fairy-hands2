import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { Search, ShoppingCart, Minus, Plus, Trash2, CreditCard, Banknote, QrCode, Clock, FileText, Bike } from 'lucide-react';

interface POSProps {
  products: Product[];
  onCompleteSale: (items: CartItem[], method: 'cash' | 'card' | 'pix' | 'pending' | 'ifood', observation?: string, deliveryCost?: number) => void;
}

export const POS: React.FC<POSProps> = ({ products, onCompleteSale }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix' | 'pending' | 'ifood'>('cash');
  const [observation, setObservation] = useState('');
  const [deliveryCost, setDeliveryCost] = useState('');

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // Check stock limit
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        // Find original product to check stock
        const originalProduct = products.find(p => p.id === id);
        if (originalProduct && newQty > originalProduct.stock) return item;
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const productsTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryValue = parseFloat(deliveryCost.replace(',', '.')) || 0;
  const finalTotal = productsTotal + deliveryValue;
  
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onCompleteSale(cart, paymentMethod, observation, deliveryValue);
    setCart([]);
    setSearchTerm('');
    setPaymentMethod('cash'); // Reset default
    setObservation('');
    setDeliveryCost('');
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-4 md:p-6 overflow-hidden">
      
      {/* Product Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar produto para vender..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 md:pb-0">
          {filteredProducts.map(product => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock === 0}
              className={`flex flex-col p-4 rounded-xl border transition-all duration-200 text-left group
                ${product.stock === 0 
                  ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-gray-100 hover:border-rose-300 hover:shadow-md'
                }`}
            >
              <div className="h-24 w-full bg-rose-50 rounded-lg mb-3 flex items-center justify-center text-rose-300">
                {/* Placeholder Image */}
                <img 
                   src={`https://picsum.photos/seed/${product.id}/200/200`} 
                   alt={product.name}
                   className="h-full w-full object-cover rounded-lg mix-blend-multiply"
                />
              </div>
              <h3 className="font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
              <div className="flex justify-between items-end mt-2">
                <span className="text-lg font-bold text-rose-600">R$ {product.price.toFixed(2)}</span>
                <span className="text-xs text-gray-500">{product.stock} un</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full md:w-96 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-[60vh] md:h-full">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <ShoppingCart className="text-rose-500" />
          <h2 className="font-bold text-lg text-gray-800">Cesta de Compras</h2>
          <span className="ml-auto bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Cesta vazia</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  <img src={`https://picsum.photos/seed/${item.id}/100/100`} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 truncate">{item.name}</h4>
                  <div className="text-rose-500 font-semibold text-sm">R$ {(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Plus size={14} /></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
          
          <div className="flex gap-2">
             {/* Observation Field */}
             <div className="relative flex-1">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Observação (Ex: Cliente João)"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
             </div>
             
             {/* Delivery Cost Field */}
             <div className="relative w-28">
                <Bike className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="number"
                  placeholder="Entrega"
                  className="w-full pl-9 pr-2 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(e.target.value)}
                />
             </div>
          </div>

          <div className="space-y-1 py-2 border-t border-gray-200 border-dashed">
             <div className="flex justify-between text-xs text-gray-500">
                <span>Produtos</span>
                <span>R$ {productsTotal.toFixed(2)}</span>
             </div>
             {deliveryValue > 0 && (
               <div className="flex justify-between text-xs text-gray-500">
                  <span>Entrega</span>
                  <span>R$ {deliveryValue.toFixed(2)}</span>
               </div>
             )}
             <div className="flex justify-between items-center text-xl font-bold text-gray-800 pt-1">
                <span>Total</span>
                <span>R$ {finalTotal.toFixed(2)}</span>
             </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <button 
              onClick={() => setPaymentMethod('cash')}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-medium border transition-colors ${paymentMethod === 'cash' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Banknote size={16} /> Dinheiro
            </button>
            <button 
              onClick={() => setPaymentMethod('card')}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-medium border transition-colors ${paymentMethod === 'card' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <CreditCard size={16} /> Cartão
            </button>
            <button 
              onClick={() => setPaymentMethod('pix')}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-medium border transition-colors ${paymentMethod === 'pix' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <QrCode size={16} /> PIX
            </button>
            <button 
              onClick={() => setPaymentMethod('ifood')}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-medium border transition-colors ${paymentMethod === 'ifood' ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Bike size={16} /> iFood
            </button>
            <button 
              onClick={() => setPaymentMethod('pending')}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-medium border transition-colors ${paymentMethod === 'pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Clock size={16} /> Fiado
            </button>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            Finalizar Venda
          </button>
        </div>
      </div>
    </div>
  );
};