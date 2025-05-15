import { notFound } from 'next/navigation';
import { LibId, libData } from '../libData';

export default function LibPage({ params }: { params: { lib: string } }) {
  const lib = params.lib as LibId;
  const Component = libData[lib]?.component;
  if (!Component) notFound();
  return <Component />;
}

export function generateStaticParams() {
  return Object.keys(libData).map((lib) => ({ lib }));
}
