export type ProjectSection = {
  title: string;
  content: string;
  tech?: string[];
  commits?: number;
};

export type ProjectMetrics = {
  totalHours?: number;
  commits?: number;
  features?: number;
  performance?: string;
};

export type TimelineItem = {
  week: string;
  hours: number;
  commits: number;
  highlights: string[];
};

export type ProjectItem = {
  id: string;
  title: string;
  subtitle?: string;
  roles?: string[];

  summary: string;
  description: string;
  sections?: ProjectSection[];

  link: string | null;
  github?: string;
  src?: {
    desktop: string;
    mobile: string;
    logo?: string;
  };
  tech?: string[];

  duration?: string;
  metrics?: ProjectMetrics;
  highlights?: string[];
  timeline?: TimelineItem[];

  private?: boolean;
  featured?: boolean;
  order?: number;
};
