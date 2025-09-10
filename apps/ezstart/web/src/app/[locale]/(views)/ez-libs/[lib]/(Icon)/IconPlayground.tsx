import { Div, H3, Icon, iconSuggestions, Input, KnownIconName, P } from '@ezstart/ui/components'
import { useMemo, useState } from 'react'

type Props = {
  title: string
}

const IconPlayground = ({ title }: Props) => {
  const [playgroundValue, setPlaygroundValue] = useState<KnownIconName | ''>('')
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  // 🔍 Filtrage dynamique
  const filteredSuggestions = useMemo(() => {
    if (!query) return []
    return iconSuggestions
      .filter(name => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 15) // limite à 15
  }, [query])

  const handleSelect = (suggestion: string) => {
    setPlaygroundValue(suggestion as KnownIconName)
    setQuery(suggestion)
    setIsFocused(false) // masque la liste après sélection
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      // si Enter → prend la première suggestion
      handleSelect(filteredSuggestions[0])
    }
  }

  return (
    <>
      <H3>{title}</H3>
      <Div size={'default'} layout={'grid'}>
        <Div size={'xs'} layout={'row'} className="relative">
          <P className="whitespace-nowrap">{'<Icon name="'}</P>

          <Input
            value={query}
            placeholder="ex: lucide:ArrowRight"
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 100)
            }}
            onKeyDown={handleKeyDown}
          />

          <P className="whitespace-nowrap">{'" />'}</P>

          {isFocused && filteredSuggestions.length > 0 && (
            <ul
              className="bg-background text-foreground"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                border: '1px solid #ddd',
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 100,
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {filteredSuggestions.map(s => (
                <li
                  key={s}
                  onClick={() => handleSelect(s)}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </Div>
        <Div layout={'center'} size={'xs'}>
          <Icon name={playgroundValue || 'lucide:HelpCircle'} size={32} />
        </Div>
      </Div>
    </>
  )
}

export default IconPlayground
