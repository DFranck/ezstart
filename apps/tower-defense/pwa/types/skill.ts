export interface SkillItem {
  name: string;
  className?: string;
  icon?: string;
  iconProps?: string;
  imgProps?: string;
}

export type Skills = {
  category: string;
  items: SkillItem[];
};
