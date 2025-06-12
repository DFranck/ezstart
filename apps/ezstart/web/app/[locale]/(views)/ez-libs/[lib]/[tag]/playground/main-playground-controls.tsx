import { Section } from '@ezstart/ui/components';
import PlaygroundCodeView from '../components/playground-code-view';
import { PlaygroundVariantSelects } from '../components/playground-variant-selects';
import { buildFakeTag } from '../utils/build-fake-tag';

type Props = {
  meta: Record<string, string[]>;
  selected: Record<string, string>;
  onChange: (prop: string, value: string) => void;
};

export const MainPlaygroundControls = ({ meta, selected, onChange }: Props) => {
  const fakeTagCode = buildFakeTag('main', selected, undefined, '...');
  const fakeAliasCode = buildFakeTag('main', selected, 'Main', '...');

  return (
    <Section>
      <PlaygroundCodeView
        fakeTagCode={fakeTagCode}
        fakeAliasCode={fakeAliasCode}
      />
      <PlaygroundVariantSelects
        meta={meta}
        selected={selected}
        onChange={onChange}
      />
    </Section>
  );
};
