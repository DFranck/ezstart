export type ProjectType = {
  title: string;
  subtitle?: string;
  roles?: string[];
  description: string;
  link: string | null;
  src?: {
    desktop: string;
    mobile: string;
  };
  tech?: string[];
  private?: boolean;
};
