'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  LI,
  P,
  Section,
  Span,
  UL,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Fragment } from 'react'

export function PartnershipSection() {
  const t = useTranslations('home')

  return (
    <Section size={'xl'} id="partnership" className="bg-muted/30">
      <Div className="container mx-auto">
        <H2 size="h3" className="text-center mb-4">
          {t('partnership.title')}
        </H2>
        <H3 size="h5" className="text-center mb-12 text-muted-foreground">
          {t('partnership.subtitle')}
        </H3>

        <Div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 max-w-6xl mx-auto mb-8">
          {(
            t.raw('partnership.values') as Array<{
              icon: string
              title: string
              items: string[]
            }>
          ).map((value, index) => (
            <Fragment key={index}>
              <Card className="bg-gp-accent/10 dark:bg-gp-accent/5 border-gp-accent dark:border-gp-accent border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg w-full md:w-auto">
                <CardHeader>
                  <Div className="flex items-center gap-3 mb-4">
                    <Div className="font-bold rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 text-xl bg-gp-primary text-primary-foreground">
                      {index + 1}
                    </Div>
                    <H3 size="h5" className="text-gp-primary">
                      {value.title}
                    </H3>
                  </Div>
                </CardHeader>
                <CardContent>
                  <UL className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    {value.items.map((item, itemIndex) => (
                      <LI key={itemIndex}>{item}</LI>
                    ))}
                  </UL>
                </CardContent>
              </Card>
              {index < 2 && (
                <Div className="flex-shrink-0 text-4xl md:text-5xl font-bold text-gp-primary my-4 md:my-0">
                  +
                </Div>
              )}
            </Fragment>
          ))}
        </Div>

        <Div className="text-center space-y-4">
          <Button asChild size="lg" className="bg-gp-primary hover:bg-gp-primary/80">
            <a href={`mailto:aseradni@nexora-venture.com`}>{t('partnership.cta')}</a>
          </Button>
          <P className="text-sm text-muted-foreground italic">{t('partnership.note')}</P>
        </Div>
      </Div>

      <Div>
        <H3 size="h5" className="text-center mb-8 text-muted-foreground">
          {t('press.title')}
        </H3>
        <Div layout={'center'} className="max-w-3xl mx-auto">
          {[
            {
              publication: t('press.vietstock.publication'),
              title: t('press.vietstock.title'),
              quote: t('press.vietstock.quote'),
              quoteVi:
                'Gần đây, chúng tôi đang thử nghiệm một ứng dụng có tên GreenPulse.AI. Đây là một trợ lý ứng dụng trí tuệ nhân tạo (AI) giúp các doanh nghiệp SME tại Việt Nam và Đông Nam Á dễ dàng thực hành bền vững. Người dùng sẽ được hướng dẫn từng bước để giải quyết các vấn đề như giảm chi phí điện, đáp ứng yêu cầu xuất khẩu, đi kèm bảng điều khiển theo dõi tiến độ. Nền tảng còn tích hợp công cụ báo cáo ESG tự động theo tiêu chuẩn quốc tế. Mục đích chính là giúp các doanh nghiệp tránh bẫy "tẩy xanh", chứng minh các cải tiến có thể đo lường, và mở rộng cơ hội tiếp cận nhà đầu tư, khách hàng cùng thị trường quốc tế.',
              logo: '/images/vietstock.svg',
              url: 'https://vietstock.vn/2025/11/tay-xanh-duoi-goc-nhin-cua-chuyen-gia-tu-van-esg-quoc-te-761-1365211.htm',
              date: t('press.vietstock.date'),
            },
          ].map((item, index) => (
            <a
              key={index}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Card className="p-6 border-l-4 border-gp-primary hover:shadow-lg transition-shadow">
                <Div className="flex flex-col md:flex-row items-start gap-6">
                  <Div className="flex-shrink-0 w-full md:w-48 space-y-4">
                    <Div className="w-32 h-12 relative">
                      <Image
                        src={item.logo}
                        alt={item.publication}
                        fill
                        className="object-contain"
                      />
                    </Div>
                    <Div className="w-full aspect-[16/9] relative rounded-md overflow-hidden border border-border">
                      <Image
                        src="/images/GLC-cover.jpg"
                        alt="GreenPulse.AI Article Cover"
                        fill
                        className="object-cover"
                      />
                    </Div>
                  </Div>
                  <Div className="flex-1 space-y-3">
                    <Div>
                      <P className="font-semibold mb-1">
                        {item.publication}{' '}
                        <Span className="text-xs text-muted-foreground">{item.date}</Span>
                      </P>
                      <P className="text-sm font-medium text-foreground">{item.title}</P>
                    </Div>
                    <P className="text-muted-foreground italic text-sm border-l-2 border-muted pl-3">
                      {item.quoteVi}
                    </P>
                    <P className="text-muted-foreground italic text-sm">{item.quote}</P>
                  </Div>
                </Div>
              </Card>
            </a>
          ))}
        </Div>
      </Div>
    </Section>
  )
}
