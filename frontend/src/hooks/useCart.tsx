import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Seva } from '../data/sevas';
import { apiRequest } from '../lib/api';

/** Catalogue and prices are loaded from FastAPI. Backend rejects any changed client totals. */
interface CartContextValue {
  catalog: Seva[];
  catalogLoading: boolean;
  catalogError: string;
  sevaIds: string[];
  items: Seva[];
  count: number;
  total: number;
  has: (id: string) => boolean;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  toggle: (id: string) => void;
  clearCart: () => void;
}
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Seva[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [sevaIds, setSevaIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setCatalogLoading(true);
      apiRequest<Seva[]>('/api/sevas')
        .then(sevas => { if (active) {setCatalog(sevas);setCatalogError('');setSevaIds(ids=>ids.filter(id=>sevas.some(s=>s.id===id)));} })
        .catch(e => { if (active) setCatalogError(e instanceof Error ? e.message : 'Unable to retrieve sevas'); })
        .finally(() => { if (active) setCatalogLoading(false); });
    };
    refresh();
    window.addEventListener('ganesh:sevas-updated',refresh);
    window.addEventListener('focus',refresh);
    return () => { active = false;window.removeEventListener('ganesh:sevas-updated',refresh);window.removeEventListener('focus',refresh); };
  }, []);

  const catalogById = useMemo(() => new Map(catalog.map(s => [s.id,s])), [catalog]);
  const addToCart = useCallback((id: string) => {
    if (!catalogById.has(id)) return;
    setSevaIds(prev => prev.includes(id) ? prev : [...prev,id]);
  },[catalogById]);
  const removeFromCart = useCallback((id: string) => setSevaIds(prev => prev.filter(s => s !== id)), []);
  const toggle = useCallback((id: string) => {
    if (!catalogById.has(id)) return;
    setSevaIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev,id]);
  },[catalogById]);
  const clearCart = useCallback(() => setSevaIds([]),[]);
  const items = useMemo(() => sevaIds.map(id => catalogById.get(id)).filter((s): s is Seva => Boolean(s)),[sevaIds,catalogById]);
  const total = useMemo(() => items.reduce((sum,s) => sum + s.price,0),[items]);
  const value = useMemo<CartContextValue>(() => ({
    catalog,catalogLoading,catalogError,sevaIds,items,count:items.length,total,
    has:(id:string)=>sevaIds.includes(id),addToCart,removeFromCart,toggle,clearCart,
  }),[catalog,catalogLoading,catalogError,sevaIds,items,total,addToCart,removeFromCart,toggle,clearCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart():CartContextValue {
  const value=useContext(CartContext);
  if (!value) throw new Error('useCart requires CartProvider');
  return value;
}
