export function buildFakeTag(
  tag: string,
  selected: Record<string, string>,
  variantComponent?: string,
  content?: string
) {
  let props = '';
  Object.entries(selected).forEach(([k, v]) => {
    if (
      (k === 'variant' && v === 'default') ||
      (k === 'intent' && v === 'default') ||
      (k === 'size' && v === tag)
    )
      return;
    props += ` ${k}="${v}"`;
  });
  if (variantComponent) {
    return `<${variantComponent}${props}>${content ?? ''}</${variantComponent}>`;
  }
  return `<Tag as="${tag}"${props}>${content ?? ''}</Tag>`;
}
