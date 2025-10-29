'use client';

import { Button, Div, Icon } from '@ezstart/ui/components';
import { useEffect, useRef, useState } from 'react';
import { QRCodeConfig } from '../types';

interface QRCodeCanvasProps {
  config: QRCodeConfig;
}

export function QRCodeCanvas({ config }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCode, setQRCode] = useState<any>(null);

  useEffect(() => {
    // Dynamically import qrcode library (client-side only)
    import('qrcode').then((QRCode) => {
      setQRCode(() => QRCode.default);
    });
  }, []);

  useEffect(() => {
    if (!qrCode || !canvasRef.current || !config.url) return;

    qrCode.toCanvas(
      canvasRef.current,
      config.url,
      {
        width: config.size,
        margin: config.includeMargin ? 4 : 0,
        color: {
          dark: config.foregroundColor,
          light: config.backgroundColor,
        },
        errorCorrectionLevel: config.errorCorrectionLevel,
      },
      (error: Error) => {
        if (error) console.error('QR Code generation error:', error);
      }
    );
  }, [qrCode, config]);

  const handleDownload = (format: 'png' | 'svg') => {
    if (!canvasRef.current || !config.url) return;

    if (format === 'png') {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.png`;
      link.href = url;
      link.click();
    } else if (format === 'svg') {
      // For SVG, we'll use the qrcode library's toString method
      if (!qrCode) return;

      qrCode.toString(
        config.url,
        {
          type: 'svg',
          width: config.size,
          margin: config.includeMargin ? 4 : 0,
          color: {
            dark: config.foregroundColor,
            light: config.backgroundColor,
          },
          errorCorrectionLevel: config.errorCorrectionLevel,
        },
        (error: Error, svgString: string) => {
          if (error) {
            console.error('SVG generation error:', error);
            return;
          }
          const blob = new Blob([svgString], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `qrcode-${Date.now()}.svg`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      );
    }
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current || !config.url) return;

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((blob) => resolve(blob!), 'image/png');
      });

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      // Show success feedback (could add toast here)
      console.log('QR Code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  };

  if (!config.url) {
    return (
      <Div layout='center' className='min-h-[300px] bg-muted/50 rounded-lg'>
        <p className='text-muted-foreground'>Enter a URL to generate QR code</p>
      </Div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Canvas Preview */}
      <Div layout='center' className='p-6 bg-muted/50 rounded-lg'>
        <canvas
          ref={canvasRef}
          className='border border-border rounded-lg shadow-sm'
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </Div>

      {/* Download Options */}
      <div className='space-y-2'>
        <p className='text-sm font-medium'>Download</p>
        <div className='flex flex-wrap gap-2'>
          <Button onClick={() => handleDownload('png')} variant='default' size='sm'>
            <Icon name='lucide:Download' size={16} ariaHidden />
            <span className='ml-2'>PNG</span>
          </Button>
          <Button onClick={() => handleDownload('svg')} variant='default' size='sm'>
            <Icon name='lucide:Download' size={16} ariaHidden />
            <span className='ml-2'>SVG</span>
          </Button>
          <Button onClick={handleCopyImage} variant='outline' size='sm'>
            <Icon name='lucide:Copy' size={16} ariaHidden />
            <span className='ml-2'>Copy Image</span>
          </Button>
        </div>
      </div>

      {/* Info */}
      {config.redirectType === 'temporary' && (
        <Div variant='card' size='sm' className='text-sm bg-muted/50'>
          <Icon name='lucide:Info' size={16} className='inline mr-2' ariaHidden />
          <span className='text-muted-foreground'>
            Temporary redirect: URL can be changed later without regenerating the QR code
          </span>
        </Div>
      )}
    </div>
  );
}
