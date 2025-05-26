import { Tag, TagProps } from '../components/tag';
import { SupportedAs } from '../types';

export function createAlias<T extends SupportedAs>(as: T) {
  return function Alias(props: Omit<TagProps<T>, 'as'>) {
    const allProps = { ...props, as } as TagProps<T>;
    return <Tag {...allProps} />;
  };
}
