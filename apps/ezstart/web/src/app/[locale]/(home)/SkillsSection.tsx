'use client'
import React from 'react'
import skillData from '../../../../public/json/skills.json'
import { Skills } from '@/types/skill'
import { Article, H2, H3, Icon, KnownIconName, LI, Section, UL } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { useSafeTranslations } from '@/hooks/useSafeIntl'

type Props = {
  id?: string
}

export const SkillsSection = ({ id }: Props): React.JSX.Element => {
  const t = useSafeTranslations('skills')
  const { isMobile } = useDevice()

  return (
    <Section id={id} size={isMobile ? 'xs' : 'lg'}>
      <H2>{t('title')}</H2>
      <UL layout="grid" className="grid-cols-2 md:grid-cols-4 lg:grid-cols-4 w-full" size={'xs'}>
        {skillData.skills.map((cat: Skills, index) => (
          <LI key={index} className="items-start">
            <Article className="w-full">
              <UL className="w-full py-4 px-2 md:py-4 " size={'xs'}>
                <H3 size="h5" className="text-center md:text-start">
                  {t(`categories.${cat.category}`, { default: cat.category })}
                </H3>
                {cat.items.map((item, idx) => (
                  <LI key={idx} className={'flex-nowrap whitespace-nowrap' + item.className}>
                    {item.icon && <Icon size={20} name={item.icon as KnownIconName} />}
                    {item.name}
                  </LI>
                ))}
              </UL>
            </Article>
          </LI>
        ))}
      </UL>
    </Section>
  )
}
