'use client';

import { Button, Icon } from '@ezstart/ui/components';
import { useState } from 'react';

type CopyCodeButtonProps = {
  code: string;
  className?: string;
};

export function CopyCodeButton({ code, className }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={className}
      aria-label={copied ? 'Code copied' : 'Copy code to clipboard'}
    >
      <Icon
        name={copied ? 'lucide:Check' : 'lucide:Copy'}
        size={16}
        ariaHidden
      />
      <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
    </Button>
  );
}
