type ProductWithHidden = {
  is_hidden?: boolean | null;
};

export function isProductHidden(product: ProductWithHidden): boolean {
  return product.is_hidden === true;
}

/** Produto oculto só aparece no catálogo se o usuário já tiver acesso. */
export function isVisibleInCatalog(
  product: ProductWithHidden,
  hasAccess: boolean
): boolean {
  if (!isProductHidden(product)) return true;
  return hasAccess;
}
