import { redirect } from 'next/navigation'

export default function TestPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/test/donate`)
}
