import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading data...', size = 'default' }) => {
  const iconSize = size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-10 h-10' : 'w-6 h-6';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
      <Loader2 className={`${iconSize} animate-spin text-brand-blue mb-3`} />
      {message && <p className="text-sm font-medium">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
