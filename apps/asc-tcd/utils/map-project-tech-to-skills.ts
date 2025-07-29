import { KnownIconName } from '@ezstart/ui/components';

type SkillItem = {
  name: string;
  icon: string;
  className: string;
};

type SkillsJson = {
  category: string;
  items: SkillItem[];
}[];

export function mapProjectTechToSkills(
  techArray: string[],
  skillsJson: SkillsJson
): SkillItem[] {
  const allSkills = skillsJson.flatMap((cat) => cat.items);

  return techArray.map((tech) => {
    const match = allSkills.find(
      (item) => item.name.toLowerCase() === tech.toLowerCase()
    );

    return match ?? { name: tech, icon: '', className: 'unknown' };
  });
}
