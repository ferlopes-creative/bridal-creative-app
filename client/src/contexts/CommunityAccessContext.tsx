import { createContext, useContext, type ReactNode } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { hasCommunityAccess } from "@/lib/communityAccess";

type CommunityAccessValue = {
  canOpenCommunity: boolean;
};

const CommunityAccessContext = createContext<CommunityAccessValue>({
  canOpenCommunity: false,
});

/** Deriva do AppDataContext (já carregado 1x por sessão) em vez de refazer
 * a mesma busca de compras — evita o cadeado do Chat piscar/duplicar fetch. */
export function CommunityAccessProvider({ children }: { children: ReactNode }) {
  const { purchasedIds } = useAppData();
  const canOpenCommunity = hasCommunityAccess(purchasedIds);

  return (
    <CommunityAccessContext.Provider value={{ canOpenCommunity }}>
      {children}
    </CommunityAccessContext.Provider>
  );
}

export function useCommunityAccess() {
  return useContext(CommunityAccessContext);
}
