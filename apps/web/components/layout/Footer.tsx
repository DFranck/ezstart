'use client';

export function Footer() {
  return (
    <footer className='border-t px-6 py-4 text-center text-xs text-muted-foreground bg-background'>
      © {new Date().getFullYear()} ezStart. All rights reserved.
    </footer>
  );
}
