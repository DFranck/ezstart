export interface QRCodeConfig {
  url: string;
  foregroundColor: string;
  backgroundColor: string;
  size: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  includeMargin: boolean;
  redirectType: 'permanent' | 'temporary';
}
