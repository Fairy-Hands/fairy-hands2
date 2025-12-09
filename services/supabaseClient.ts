import { createClient } from '@supabase/supabase-js';

// Configurações fornecidas
const PROVIDED_URL = "https://dczpqdpuytggikxnfvrd.supabase.co";
// Chave JWT Anon Public correta
const PROVIDED_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjenBxZHB1eXRnZ2lreG5mdnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODUwMTUsImV4cCI6MjA4MDQ2MTAxNX0.pjpz2KFQggQxr1R4Awh2Ntl3MEggoqxubku6ZJ0MfxA";

// Tenta pegar das variáveis de ambiente (útil para deploy na Vercel depois), 
// mas usa os valores fornecidos diretamente se não houver variáveis.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || PROVIDED_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || PROVIDED_KEY;

// Só cria o cliente se as chaves existirem
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isCloudEnabled = !!supabase;