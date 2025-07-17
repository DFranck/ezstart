export interface SkillType {
  name: string;
  className?: string;
  icon?: string;
  iconProps?: string;
  imgProps?: string;
}

export type SkillsType = {
  category: string;
  items: SkillType[];
};
