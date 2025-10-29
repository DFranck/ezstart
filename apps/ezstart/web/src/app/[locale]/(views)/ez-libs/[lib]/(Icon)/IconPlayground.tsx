'use client';

import {
  Button,
  Div,
  H3,
  H4,
  H6,
  Icon,
  iconSuggestions,
  Input,
  KnownIconName,
  Label,
  P,
} from '@ezstart/ui/components';
import { useMemo, useState } from 'react';
import { CopyCodeButton } from '../components/copy-code-button';
import { ResetButton } from '../components/reset-button';

type Props = {
  title: string;
};

// Popular icons to showcase
const POPULAR_ICONS: KnownIconName[] = [
  'lucide:Heart',
  'lucide:Star',
  'lucide:Home',
  'lucide:User',
  'lucide:Settings',
  'lucide:Search',
  'lucide:Bell',
  'lucide:Mail',
  'lucide:Calendar',
  'lucide:Clock',
  'lucide:Check',
  'lucide:X',
  'lucide:ArrowRight',
  'lucide:ArrowLeft',
  'lucide:Download',
  'lucide:Upload',
];

const DEFAULT_SIZE = 32;
const DEFAULT_SPIN = false;

const IconPlayground = ({ title }: Props) => {
  const [playgroundValue, setPlaygroundValue] = useState<KnownIconName | ''>(
    ''
  );
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [spin, setSpin] = useState(DEFAULT_SPIN);

  // 🔍 Filtrage dynamique
  const filteredSuggestions = useMemo(() => {
    if (!query) return [];
    return iconSuggestions
      .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 15); // limite à 15
  }, [query]);

  const handleSelect = (suggestion: string) => {
    setPlaygroundValue(suggestion as KnownIconName);
    setQuery(suggestion);
    setIsFocused(false); // masque la liste après sélection
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      // si Enter → prend la première suggestion
      const firstSuggestion = filteredSuggestions[0];
      if (firstSuggestion) {
        handleSelect(firstSuggestion);
      }
    }
  };

  const handleReset = () => {
    setPlaygroundValue('');
    setQuery('');
    setSize(DEFAULT_SIZE);
    setSpin(DEFAULT_SPIN);
  };

  // Build code string
  const iconName = playgroundValue || 'lucide:HelpCircle';
  let code = `<Icon name="${iconName}"`;
  if (size !== DEFAULT_SIZE) code += ` size={${size}}`;
  if (spin) code += ` spin`;
  code += ' />';

  return (
    <>
      <H3>{title}</H3>

      {/* Search Input */}
      <Div size={'default'} layout={'grid'}>
        <Div size={'xs'} layout={'row'} className='relative'>
          <P className='whitespace-nowrap'>{'<Icon name="'}</P>

          <Input
            value={query}
            placeholder='ex: lucide:ArrowRight'
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 100);
            }}
            onKeyDown={handleKeyDown}
            aria-label='Search for an icon'
          />

          <P className='whitespace-nowrap'>{'" />'}</P>

          {isFocused && filteredSuggestions.length > 0 && (
            <ul
              className='bg-card border border-border rounded shadow-lg'
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 100,
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
              role='listbox'
              aria-label='Icon suggestions'
            >
              {filteredSuggestions.map((s) => (
                <li
                  key={s}
                  onClick={() => handleSelect(s)}
                  className='px-3 py-2 cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0'
                  role='option'
                  aria-selected={s === playgroundValue}
                >
                  <span className='flex items-center gap-2'>
                    <Icon name={s} size={16} ariaHidden />
                    <span className='text-sm'>{s}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Div>
      </Div>

      {/* Controls */}
      <Div
        size={'default'}
        layout={'grid'}
        variant={'outline'}
        className='gap-4'
      >
        {/* Size Control */}
        <div className='space-y-2'>
          <Label className='flex items-center justify-between'>
            <span>Size: {size}px</span>
            <ResetButton
              onReset={handleReset}
              className='h-8'
            />
          </Label>
          <input
            type='range'
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            min={16}
            max={128}
            step={4}
            className='w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary'
            aria-label='Icon size in pixels'
          />
        </div>

        {/* Spin Control */}
        <div className='space-y-2'>
          <Label>Animation</Label>
          <Button
            variant={spin ? 'default' : 'outline'}
            size='sm'
            onClick={() => setSpin(!spin)}
            className='w-full'
            aria-pressed={spin}
            aria-label='Toggle spin animation'
          >
            <Icon name='lucide:RotateCw' size={16} ariaHidden spin={spin} />
            <span className='ml-2'>{spin ? 'Spin Active' : 'Enable Spin'}</span>
          </Button>
        </div>
      </Div>

      {/* Preview */}
      <Div
        layout={'center'}
        size={'default'}
        variant={'outline'}
        className='min-h-[200px]'
      >
        <Icon
          name={iconName}
          size={size}
          spin={spin}
        />
      </Div>

      {/* Code Preview */}
      <Div size={'default'} variant={'outline'}>
        <div className='flex items-center justify-between mb-2'>
          <H6>Generated Code</H6>
          <CopyCodeButton code={code} />
        </div>
        <pre className='bg-muted text-muted-foreground rounded p-3 text-sm overflow-x-auto'>
          <code>{code}</code>
        </pre>
      </Div>

      {/* Popular Icons */}
      <div className='space-y-3'>
        <H4>Popular Icons</H4>
        <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3'>
          {POPULAR_ICONS.map((iconName) => (
            <button
              key={iconName}
              onClick={() => {
                setPlaygroundValue(iconName);
                setQuery(iconName);
              }}
              className='flex flex-col items-center justify-center p-3 rounded border border-border hover:bg-muted transition-colors cursor-pointer aspect-square'
              aria-label={`Select ${iconName}`}
            >
              <Icon name={iconName} size={24} ariaHidden />
              <span className='text-xs mt-1 text-center text-muted-foreground truncate w-full'>
                {iconName.split(':')[1]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default IconPlayground;
