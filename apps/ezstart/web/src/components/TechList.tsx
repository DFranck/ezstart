import skillsJson from '../../public/json/skills.json';
import { mapProjectTechToSkills } from '@/utils/map-project-tech-to-skills';
import { Icon, LI, UL, isValidIconName } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';

type Props = {
  tech: string[];
};

const TechList = ({ tech }: Props) => {
  const { isMobile } = useDevice();

  const techList = tech ? mapProjectTechToSkills(tech, skillsJson.skills) : [];

  return (
    <>
      {techList.length > 0 && (
        <UL className='text-xs' layout={'row'} size={'default'}>
          {techList.map((tech) => (
            <LI
              key={tech.name}
              variant={isMobile ? 'default' : 'card'}
              size={'default'}
              className='py-1 px-2 whitespace-nowrap flex items-center gap-2'
            >
              {isValidIconName(tech.icon) ? (
                <Icon name={tech.icon} size={20} />
              ) : (
                <Icon name='lucide:HelpCircle' size={20} />
              )}
              {!isMobile && tech.name}
            </LI>
          ))}
        </UL>
      )}
    </>
  );
};

export default TechList;
