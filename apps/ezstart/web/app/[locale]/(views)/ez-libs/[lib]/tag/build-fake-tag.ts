export function buildFakeTag(
  tag: string,
  selected: Record<string, string>,
  aliasComponent?: string,
  content?: string
) {
  let props = '';
  Object.entries(selected).forEach(([k, v]) => {
    // Ignore default variants
    if (
      (k === 'variant' && v === 'default') ||
      (k === 'intent' && v === 'default') ||
      (k === 'size' && v === tag)
    )
      return;
    // Affiche uniquement la prop sans valeur si "true"
    if (v === 'true') {
      props += ` ${k}`;
      return;
    }
    // N'affiche pas la prop si "false"
    if (v === 'false') return;
    // Sinon, string classique
    props += ` ${k}="${v}"`;
  });
  if (aliasComponent) {
    return `<${aliasComponent}${props}>${content ?? ''}</${aliasComponent}>`;
  }
  return `<Tag as="${tag}"${props}>${content ?? ''}</Tag>`;
}
