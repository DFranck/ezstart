import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getApiUrl } from '@ezstart/config'
import {
  Button,
  Card,
  CardContent,
  Div,
  H1,
  Icon,
  Main,
  MarkdownContent,
  P,
} from '@ezstart/ui/components'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export const dynamic = 'force-static'

async function loadReadme(): Promise<string> {
  // Resolve relative to the app's cwd at build/runtime. Included in the serverless
  // bundle via `outputFileTracingIncludes` in next.config.js.
  const readmePath = join(process.cwd(), '../../../packages/auth-sdk/README.md')
  try {
    return await readFile(readmePath, 'utf-8')
  } catch {
    return '# Documentation\n\nSDK README not available.'
  }
}

export default async function DocsPage() {
  const t = await getTranslations('docs')
  const readme = await loadReadme()
  const apiDocsUrl = `${getApiUrl('ezauth')}/docs`
  const githubUrl = 'https://github.com/DFranck/ezstart/tree/master/packages/auth-sdk'

  return (
    <Main className="container mx-auto max-w-4xl py-8 px-4 space-y-8">
      <Div className="text-center space-y-4">
        <H1 size="h1">{t('title')}</H1>
        <P className="text-muted-foreground">{t('subtitle')}</P>
        <Div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="default" className="gap-2">
            <Link href="/docs/components">
              <Icon name="lucide:LayoutGrid" className="h-4 w-4" />
              <span>Browse components (48)</span>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={apiDocsUrl} target="_blank" rel="noopener noreferrer">
              {t('apiReferenceButton')}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              {t('viewOnGithub')}
            </a>
          </Button>
        </Div>
      </Div>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardContent className="p-6 md:p-8 min-w-0">
          <MarkdownContent content={readme} />
        </CardContent>
      </Card>
    </Main>
  )
}
