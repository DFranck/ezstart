import { notFound } from 'next/navigation';
import EzTagPage from './EzTagPage';

const LibPage = ({ params }: { params: { lib: string } }) => {
  const { lib } = params;

  switch (lib) {
    case 'ez-tag':
      return <EzTagPage />;
    default:
      notFound();
  }
};

export default LibPage;
