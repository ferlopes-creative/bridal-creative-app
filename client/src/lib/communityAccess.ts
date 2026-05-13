export function hasCommunityAccess(purchasedIds: Set<string>): boolean {
  return purchasedIds.size > 0;
}
