import { isBonusUnlockedByKit, type KitBonusRow } from "@/lib/kitBonus";

export type ProductLike = {
  id: string;
  type?: string | null;
};

export function canAccessProduct(
  product: ProductLike,
  purchasedIds: Set<string>,
  kitBonusRows: KitBonusRow[]
): boolean {
  if (purchasedIds.has(product.id)) return true;
  const t = (product.type || "PRO").toUpperCase();
  if (t === "BON") {
    return isBonusUnlockedByKit(product.id, purchasedIds, kitBonusRows);
  }
  return false;
}
