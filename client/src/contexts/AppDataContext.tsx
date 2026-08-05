import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/components/ProductGrid";
import type { KitBonusRow } from "@/lib/kitBonus";
import { useAppAccessState } from "@/contexts/AppAccessContext";
import { supabase } from "@/lib/supabase";

type AppDataState = {
  products: Product[];
  purchasedIds: Set<string>;
  kitBonusRows: KitBonusRow[];
  /** true assim que o primeiro carregamento termina; fica true mesmo durante refresh em segundo plano. */
  ready: boolean;
  refresh: () => void;
};

const AppDataContext = createContext<AppDataState>({
  products: [],
  purchasedIds: new Set(),
  kitBonusRows: [],
  ready: false,
  refresh: () => {},
});

/**
 * Busca produtos/compras/kit-bônus uma única vez por sessão e compartilha entre
 * Dashboard, página de produto e página de categoria — evita que cada navegação
 * refaça o mesmo fetch e mostre spinner de página inteira de novo.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const { appAccess } = useAppAccessState();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [kitBonusRows, setKitBonusRows] = useState<KitBonusRow[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((tick) => tick + 1), []);

  useEffect(() => {
    if (!appAccess) return;
    let cancelled = false;

    const load = async () => {
      const [{ data: userData }, { data: kbData }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("kit_bonus_products").select("kit_product_id, bonus_product_id"),
        supabase.from("products").select("*").order("name", { ascending: true }),
      ]);
      if (cancelled) return;

      setKitBonusRows(kbData ? (kbData as KitBonusRow[]) : []);

      if (error) {
        console.error("AppDataContext / products:", error);
      } else if (data) {
        setProducts(
          data.map((item: any) => ({
            id: item.id,
            name: item.name ?? item.title ?? "Produto",
            description: item.description ?? item.descricao ?? null,
            type: (item.type ?? item.tipo ?? "PRO") as "PRO" | "BON" | string,
            image_url: item.image_url ?? item.image ?? null,
            image: item.image ?? null,
            thumbnail_url: item.thumbnail_url ?? null,
            video_url: item.video_url ?? item.video ?? null,
            link_compra: item.link_compra ?? item.link ?? null,
            is_hidden: item.is_hidden === true,
            price: item.price != null ? Number(item.price) : null,
            promo_price: item.promo_price != null ? Number(item.promo_price) : null,
          }))
        );
      }

      if (userData.user) {
        const { data: purchasesData } = await supabase
          .from("purchases")
          .select("product_id, status")
          .eq("user_id", userData.user.id)
          .eq("status", "active");
        if (!cancelled && purchasesData) {
          setPurchasedIds(new Set(purchasesData.map((item) => item.product_id)));
        }
      } else if (!cancelled) {
        setPurchasedIds(new Set());
      }

      if (!cancelled) setReady(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [appAccess, refreshTick]);

  return (
    <AppDataContext.Provider value={{ products, purchasedIds, kitBonusRows, ready, refresh }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataState {
  return useContext(AppDataContext);
}
