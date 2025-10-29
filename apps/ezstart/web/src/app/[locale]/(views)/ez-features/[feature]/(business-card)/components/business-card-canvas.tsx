'use client';

import { Button, Div, Icon } from '@ezstart/ui/components';
import { useEffect, useRef, useState } from 'react';
import { BusinessCardConfig, BusinessCardData, CARD_DIMENSIONS } from '../types';

interface BusinessCardCanvasProps {
  data: BusinessCardData;
  config: BusinessCardConfig;
}

export function BusinessCardCanvas({ data, config }: BusinessCardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCode, setQRCode] = useState<any>(null);

  useEffect(() => {
    // Dynamically import qrcode library
    import('qrcode').then((QRCode) => {
      setQRCode(() => QRCode.default);
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);

    // Render based on template
    switch (config.template) {
      case 'classic':
        renderClassicTemplate(ctx, data, config);
        break;
      case 'modern':
        renderModernTemplate(ctx, data, config);
        break;
      case 'minimal':
        renderMinimalTemplate(ctx, data, config);
        break;
      case 'creative':
        renderCreativeTemplate(ctx, data, config);
        break;
    }

    // Add QR code if enabled
    if (config.includeQR && qrCode) {
      const qrData = getQRData(data, config.qrData);
      if (qrData) {
        qrCode.toDataURL(qrData, { width: 150, margin: 1 }, (err: Error, url: string) => {
          if (!err) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, CARD_DIMENSIONS.width - 180, CARD_DIMENSIONS.height - 180, 150, 150);
            };
            img.src = url;
          }
        });
      }
    }
  }, [data, config, qrCode]);

  const handleDownload = (format: 'png' | 'pdf') => {
    if (!canvasRef.current || !data.name) return;

    if (format === 'png') {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `business-card-${data.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = url;
      link.click();
    } else if (format === 'pdf') {
      // For PDF, we'll need to use jsPDF (will add in dependencies)
      import('jspdf').then(({ default: jsPDF }) => {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [2, 3.5], // Business card size
        });

        const imgData = canvasRef.current!.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 3.5, 2);
        pdf.save(`business-card-${data.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      });
    }
  };

  if (!data.name) {
    return (
      <Div layout='center' className='min-h-[300px] bg-muted/50 rounded-lg'>
        <p className='text-muted-foreground'>Enter your name to preview</p>
      </Div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Canvas Preview */}
      <Div layout='center' className='p-6 bg-muted/50 rounded-lg'>
        <canvas
          ref={canvasRef}
          width={CARD_DIMENSIONS.width}
          height={CARD_DIMENSIONS.height}
          className='border border-border rounded-lg shadow-lg'
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </Div>

      {/* Download Options */}
      <div className='space-y-2'>
        <p className='text-sm font-medium'>Export</p>
        <div className='flex flex-wrap gap-2'>
          <Button onClick={() => handleDownload('png')} variant='default' size='sm'>
            <Icon name='lucide:Download' size={16} ariaHidden />
            <span className='ml-2'>PNG (Print Quality)</span>
          </Button>
          <Button onClick={() => handleDownload('pdf')} variant='default' size='sm'>
            <Icon name='lucide:FileText' size={16} ariaHidden />
            <span className='ml-2'>PDF</span>
          </Button>
        </div>
        <p className='text-xs text-muted-foreground'>
          Standard size: 3.5" × 2" (89mm × 51mm) at 300 DPI
        </p>
      </div>
    </div>
  );
}

function getQRData(data: BusinessCardData, type: BusinessCardConfig['qrData']): string {
  switch (type) {
    case 'vcard':
      return `BEGIN:VCARD
VERSION:3.0
FN:${data.name}
TITLE:${data.title}
ORG:${data.company}
TEL:${data.phone}
EMAIL:${data.email}
URL:${data.website}
ADR:;;${data.address}
END:VCARD`;
    case 'website':
      return data.website;
    case 'whatsapp':
      return `https://wa.me/${data.whatsapp.replace(/\D/g, '')}`;
    case 'email':
      return `mailto:${data.email}`;
    default:
      return '';
  }
}

function renderClassicTemplate(
  ctx: CanvasRenderingContext2D,
  data: BusinessCardData,
  config: BusinessCardConfig
) {
  const { width, height } = CARD_DIMENSIONS;

  // Header bar
  ctx.fillStyle = config.primaryColor;
  ctx.fillRect(0, 0, width, 100);

  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Arial';
  ctx.fillText(data.name, 40, 70);

  // Title
  ctx.fillStyle = config.textColor;
  ctx.font = '32px Arial';
  ctx.fillText(data.title, 40, 160);

  // Company
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = config.secondaryColor;
  ctx.fillText(data.company, 40, 210);

  // Contact info
  ctx.font = '24px Arial';
  ctx.fillStyle = config.textColor;
  let yPos = 280;

  if (data.email) {
    ctx.fillText(`✉ ${data.email}`, 40, yPos);
    yPos += 40;
  }
  if (data.phone) {
    ctx.fillText(`☎ ${data.phone}`, 40, yPos);
    yPos += 40;
  }
  if (data.website) {
    ctx.fillText(`🌐 ${data.website}`, 40, yPos);
  }
}

function renderModernTemplate(
  ctx: CanvasRenderingContext2D,
  data: BusinessCardData,
  config: BusinessCardConfig
) {
  const { width, height } = CARD_DIMENSIONS;

  // Diagonal accent
  ctx.fillStyle = config.primaryColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.4, 0);
  ctx.lineTo(0, height * 0.6);
  ctx.closePath();
  ctx.fill();

  // Name
  ctx.fillStyle = config.textColor;
  ctx.font = 'bold 56px Arial';
  ctx.fillText(data.name, width * 0.45, 100);

  // Title
  ctx.font = '28px Arial';
  ctx.fillStyle = config.secondaryColor;
  ctx.fillText(data.title, width * 0.45, 150);

  // Company
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = config.primaryColor;
  ctx.fillText(data.company, width * 0.45, 200);

  // Contact info (stacked vertically)
  ctx.font = '22px Arial';
  ctx.fillStyle = config.textColor;
  let yPos = 280;

  [data.email, data.phone, data.website].filter(Boolean).forEach((info) => {
    ctx.fillText(info, width * 0.45, yPos);
    yPos += 35;
  });
}

function renderMinimalTemplate(
  ctx: CanvasRenderingContext2D,
  data: BusinessCardData,
  config: BusinessCardConfig
) {
  const { width, height } = CARD_DIMENSIONS;

  // Simple centered layout
  ctx.textAlign = 'center';

  // Name
  ctx.fillStyle = config.textColor;
  ctx.font = 'bold 60px Arial';
  ctx.fillText(data.name, width / 2, height / 2 - 80);

  // Thin line
  ctx.strokeStyle = config.primaryColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height / 2 - 40);
  ctx.lineTo(width * 0.7, height / 2 - 40);
  ctx.stroke();

  // Title
  ctx.font = '28px Arial';
  ctx.fillStyle = config.secondaryColor;
  ctx.fillText(data.title, width / 2, height / 2);

  // Company
  ctx.font = '24px Arial';
  ctx.fillStyle = config.textColor;
  ctx.fillText(data.company, width / 2, height / 2 + 40);

  // Contact (small, centered)
  ctx.font = '20px Arial';
  ctx.fillStyle = config.textColor;
  const contactInfo = [data.email, data.phone].filter(Boolean).join(' • ');
  ctx.fillText(contactInfo, width / 2, height / 2 + 100);

  ctx.textAlign = 'left'; // Reset
}

function renderCreativeTemplate(
  ctx: CanvasRenderingContext2D,
  data: BusinessCardData,
  config: BusinessCardConfig
) {
  const { width, height } = CARD_DIMENSIONS;

  // Circular accent
  ctx.fillStyle = config.primaryColor;
  ctx.beginPath();
  ctx.arc(width - 150, 150, 200, 0, Math.PI * 2);
  ctx.fill();

  // Secondary circle
  ctx.fillStyle = config.secondaryColor;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(width - 100, height - 100, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Name (vertical stack)
  ctx.fillStyle = config.textColor;
  ctx.font = 'bold 52px Arial';
  ctx.fillText(data.name, 40, 120);

  // Title
  ctx.font = 'italic 30px Arial';
  ctx.fillStyle = config.secondaryColor;
  ctx.fillText(data.title, 40, 170);

  // Company in accent color
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = config.primaryColor;
  ctx.fillText(data.company, 40, 220);

  // Contact info
  ctx.font = '22px Arial';
  ctx.fillStyle = config.textColor;
  let yPos = 300;

  [data.email, data.phone, data.website].filter(Boolean).forEach((info) => {
    ctx.fillText(info, 40, yPos);
    yPos += 35;
  });
}
