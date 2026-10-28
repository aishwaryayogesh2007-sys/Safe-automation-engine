import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  action = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-dark-900/50 rounded-xl border border-gray-800/80">
      <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center text-gray-400 mb-4 border border-gray-700/50">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-gray-200 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
