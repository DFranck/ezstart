'use client';

import { isDebug, isDevEnv } from '../lib';

const DebugIndicator = () => {
  if (!isDevEnv()) return null;

  const active = isDebug();

  return (
    <div
      className={`fixed top-2 right-2 z-50 text-xs px-2 py-1 rounded shadow font-mono ${
        active
          ? 'bg-green-600 text-white'
          : 'bg-gray-800 text-gray-400 border border-gray-600'
      }`}
    >
      {active ? 'DEBUG ON' : 'DEBUG OFF'}
    </div>
  );
};

export default DebugIndicator;
