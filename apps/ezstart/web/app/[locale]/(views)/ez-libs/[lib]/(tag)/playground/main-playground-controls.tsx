import {
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components';
import PlaygroundCode from '../components/playground-code';
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
    <Section variant={'outline'}>
      <PlaygroundCode fakeTagCode={fakeTagCode} fakeAliasCode={fakeAliasCode} />
      <div className='grid gap-3 md:grid-cols-3'>
        {Object.entries(meta).map(([variantName, values]) => (
          <div key={variantName} className='flex flex-col gap-1'>
            <label className='text-xs font-medium text-neutral-400'>
              {variantName}
            </label>
            <Select
              value={selected[variantName]}
              onValueChange={(v: string) => onChange(variantName, v)}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder={variantName} />
              </SelectTrigger>
              <SelectContent>
                {values.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </Section>
  );
};
