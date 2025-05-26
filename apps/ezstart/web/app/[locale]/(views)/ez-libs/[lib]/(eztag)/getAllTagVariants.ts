import { tagVariantsMeta } from '@ezstart/ui';

type TagVariantsExport = Record<string, Record<string, string[]>>;

export function getAllTagVariants(): TagVariantsExport {
  const result: TagVariantsExport = {};
  console.log('result', result);
  console.log('tagVariantsMeta', tagVariantsMeta);
  Object.entries(tagVariantsMeta).forEach(([tag, cvaFactory]) => {
    if (typeof cvaFactory !== 'function') return;
    const allVariants = (cvaFactory as any).variants || {};
    const propMap: Record<string, string[]> = {};
    for (const [variantName, values] of Object.entries(allVariants)) {
      propMap[variantName] = Object.keys(values || {});
    }
    result[tag] = propMap;
  });

  return result;
}
