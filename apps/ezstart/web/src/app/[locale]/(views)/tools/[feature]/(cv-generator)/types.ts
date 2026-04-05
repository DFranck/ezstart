export interface CVPersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  github: string;
  website: string;
}

export interface CVExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string[];
  technologies?: string[];
}

export interface CVEducation {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  achievements?: string[];
}

export interface CVSkill {
  category: string;
  skills: string[];
}

export interface CVLanguage {
  name: string;
  proficiency: 'Native' | 'Fluent' | 'Professional' | 'Intermediate' | 'Basic';
}

export interface CVCertification {
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  url?: string;
}

export interface CVData {
  personalInfo: CVPersonalInfo;
  summary: string;
  experience: CVExperience[];
  education: CVEducation[];
  skills: CVSkill[];
  languages: CVLanguage[];
  certifications: CVCertification[];
}

export interface CVConfig {
  template: 'professional' | 'modern' | 'creative' | 'academic';
  primaryColor: string;
  useAI: boolean;
  aiSources: {
    githubUsername: string;
    linkedInProfile: string;
    additionalContext: string;
  };
}
