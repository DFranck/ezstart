export function buildFakeTag(
  tag: string,
  selected: Record<string, string>,
  variantComponent?: string
) {
  // Ex : variantComponent = "H2" ou "EzTag"
  // On n'affiche pas les props à leur valeur "par défaut"
  // Ici "default" (pour variant/intent) et la taille du tag pour size
  let props = '';
  Object.entries(selected).forEach(([k, v]) => {
    // On skip si c'est la valeur native
    if (
      (k === 'variant' && v === 'default') ||
      (k === 'intent' && v === 'default') ||
      (k === 'size' && v === tag)
    )
      return;
    props += ` ${k}="${v}"`;
  });
  if (variantComponent) {
    // Version alias <H2 ... />
    return `<${variantComponent}${props} />`;
  }
  // Version polymorphe <EzTag as="h2" ... />
  return `<EzTag as="${tag}"${props} />`;
}
