import {
  H6,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components';
import { buildFakeTag } from './build-fake-tag';

type Props = {
  meta: Record<string, string[]>;
  selected: Record<string, string>;
  onChange: (prop: string, value: string) => void;
};

export const MainPlaygroundControls = ({ meta, selected, onChange }: Props) => {
  const aliasComponent = `Main`;
  const content = `{children}`;
  const fakeTagCode = buildFakeTag('main', selected, undefined, content);
  const fakeAliasCode = buildFakeTag('main', selected, aliasComponent, content);

  return (
    <Section variant={'outline'}>
      <div className='mb-3'>
        <div className='grid grid-cols-1 gap-2'>
          <div>
            <H6 className='mb-1'>Usage</H6>
            <pre className='bg-muted rounded p-2 text-xs overflow-x-auto'>
              <code>{fakeTagCode}</code>
            </pre>
          </div>
          <div>
            <H6 className='mb-1'>Alias</H6>
            <pre className='bg-muted rounded p-2 text-xs overflow-x-auto'>
              <code>{fakeAliasCode}</code>
            </pre>
          </div>
        </div>
      </div>
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
