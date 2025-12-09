import { supabase, isCloudEnabled } from './supabaseClient';
import { Product, Sale } from './types';

// Mock Data for fallback
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Brigadeiro Gourmet', category: 'Doces', price: 3.50, cost: 1.20, stock: 50 },
  { id: '2', name: 'Trufa de Maracujá', category: 'Chocolates', price: 4.50, cost: 1.80, stock: 30 },
  { id: '3', name: 'Coxinha de Morango', category: 'Doces', price: 6.00, cost: 2.50, stock: 15 },
  { id: '4', name: 'Barra de Chocolate 100g', category: 'Chocolates', price: 12.00, cost: 6.00, stock: 8 },
  { id: '5', name: 'Bolo de Pote Ninho', category: 'Doces', price: 10.00, cost: 4.00, stock: 2 },
  { id: '6', name: 'Água Mineral', category: 'Bebidas', price: 3.00, cost: 1.00, stock: 100 },
];

// --- Authentication ---

export const verifyCredentials = async (username: string, password: string): Promise<boolean> => {
  // 1. Tenta verificar no Supabase (se a tabela app_users existir)
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // Nota: Em produção real, senhas devem ser hash (bcrypt), mas para este escopo simples usamos texto.
      .single();

    if (!error && data) {
      return true;
    }
  }

  // 2. Fallback Hardcoded (Para funcionar imediatamente para o usuário testar)
  // Útil se a pessoa ainda não criou a tabela no banco
  if (username === 'admin' && password === 'admin') {
    return true;
  }

  return false;
};

// --- Images ---

export const uploadImage = async (file: File): Promise<string | null> => {
  if (!isCloudEnabled || !supabase) {
    alert("O upload de imagens só funciona no modo Online (Supabase configurado).");
    return null;
  }

  try {
    // Sanitizar nome do arquivo (remove acentos e espaços)
    const fileExt = file.name.split('.').pop();
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log("Tentando upload para:", filePath);

    const { error: uploadError } = await supabase.storage
      .from('images') // O nome do bucket criado no painel deve ser 'images'
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro detalhado do Supabase:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error: any) {
    console.error('Falha no upload:', error);
    let msg = 'Erro ao enviar imagem.';
    if (error.message && error.message.includes('row-level security')) {
      msg = 'Erro de Permissão: Você precisa criar uma Policy no Supabase Storage permitindo INSERT para o bucket "images".';
    }
    alert(msg);
    return null;
  }
};

// --- Products ---

export const fetchProducts = async (): Promise<Product[]> => {
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      // Ensure numeric types are actually numbers
      return data.map((p: any) => ({
        ...p,
        price: Number(p.price),
        cost: Number(p.cost),
        stock: Number(p.stock)
      }));
    }
    console.error('Supabase error fetching products:', error);
    return [];
  } else {
    // LocalStorage Fallback
    const saved = localStorage.getItem('docegestao_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  }
};

export const saveProduct = async (product: Product, isUpdate: boolean) => {
  if (isCloudEnabled && supabase) {
    if (isUpdate) {
      await supabase.from('products').update(product).eq('id', product.id);
    } else {
      await supabase.from('products').insert(product);
    }
  } else {
    // LocalStorage Logic
    return Promise.resolve(); 
  }
};

export const deleteProductRemote = async (id: string) => {
  if (isCloudEnabled && supabase) {
    await supabase.from('products').delete().eq('id', id);
  }
};

// --- Sales ---

export const fetchSales = async (): Promise<Sale[]> => {
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase.from('sales').select('*');
    if (!error && data) {
      return data.map((s: any) => ({
        ...s,
        total: Number(s.total),
        items: s.items // items is JSONB, automatically parsed to array
      }));
    }
    console.error('Supabase error fetching sales:', error);
    return [];
  } else {
    const saved = localStorage.getItem('docegestao_sales');
    return saved ? JSON.parse(saved) : [];
  }
};

export const saveSale = async (sale: Sale) => {
  if (isCloudEnabled && supabase) {
    // Ensure items is stored as JSONB compatible format
    await supabase.from('sales').insert(sale);
  }
};

export const updateSalePayment = async (saleId: string, newMethod: 'cash' | 'card' | 'pix' | 'ifood') => {
  if (isCloudEnabled && supabase) {
    await supabase.from('sales').update({ paymentMethod: newMethod }).eq('id', saleId);
  }
};

// --- Stock Updates ---
export const updateStockBatch = async (items: {id: string, newStock: number}[]) => {
  if (isCloudEnabled && supabase) {
    for (const item of items) {
      await supabase.from('products').update({ stock: item.newStock }).eq('id', item.id);
    }
  }
};