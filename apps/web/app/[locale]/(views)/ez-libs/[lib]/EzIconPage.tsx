import { IconGallery, IconGalleryItem } from '@/components/IconGallery';
import { customIcons, faIcons, lucideIcons } from '@ezstart/ez-icon';

const allIcons = [
  ...lucideIcons.map((name) => ({ lib: 'lucide', name })),
  ...faIcons.map((name) => ({ lib: 'fa', name })),
  ...customIcons.map((name) => ({ lib: 'custom', name })),
];

const EzIconPage = () => {
  return (
    <IconGallery
      title='All Icons'
      icons={allIcons as IconGalleryItem[]}
      height={400}
    />
  );
};
export default EzIconPage;
