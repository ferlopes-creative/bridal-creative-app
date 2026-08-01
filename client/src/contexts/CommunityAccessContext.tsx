import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { hasCommunityAccess } from "@/lib/communityAccess";
import { supabase } from "@/lib/supabase";

type CommunityAccessValue = {
  canOpenCommunity: boolean;
};

const CommunityAccessContext = createContext<CommunityAccessValue>({
  canOpenCommunity: false,
});

/** Calculado 1x por sessão (não a cada troca de aba) pra o cadeado do Chat
 * no menu inferior não piscar toda vez que a pessoa navega. */
export function CommunityAccessProvider({ children }: { children: ReactNode }) {
  const [canOpenCommunity, setCanOpenCommunity] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (!cancelled) setCanOpenCommunity(false);
        return;
      }

      const { data: purchasesData, error } = await supabase
        .from("purchases")
        .select("product_id, status")
        .eq("user_id", data.user.id)
        .eq("status", "active");

      if (cancelled) return;
      if (error || !purchasesData) {
        setCanOpenCommunity(false);
        return;
      }
      const purchasedIds = new Set(purchasesData.map((item) => String(item.product_id)));
      setCanOpenCommunity(hasCommunityAccess(purchasedIds));
    };

    void load();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <CommunityAccessContext.Provider value={{ canOpenCommunity }}>
      {children}
    </CommunityAccessContext.Provider>
  );
}

export function useCommunityAccess() {
  return useContext(CommunityAccessContext);
}
