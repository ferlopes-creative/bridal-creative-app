export type KitBonusRow = {
  kit_product_id: string;
  bonus_product_id: string;
};

/** Bônus liberado se o usuário comprou algum kit associado na tabela kit_bonus_products. */
export function isBonusUnlockedByKit(
  bonusProductId: string,
  purchasedIds: Set<string>,
  rows: KitBonusRow[]
): boolean {
  const neededKits = rows
    .filter((r) => r.bonus_product_id === bonusProductId)
    .map((r) => r.kit_product_id);
  if (neededKits.length === 0) return false;
  return neededKits.some((kitId) => purchasedIds.has(kitId));
}
