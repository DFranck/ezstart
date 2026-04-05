export interface BusinessCardData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
}

export interface BusinessCardConfig {
  template: 'classic' | 'modern' | 'minimal' | 'creative';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  includeQR: boolean;
  qrData: 'vcard' | 'website' | 'whatsapp' | 'email';
}

export const CARD_DIMENSIONS = {
  width: 1050, // 3.5 inches at 300 DPI
  height: 600, // 2 inches at 300 DPI
} as const;
