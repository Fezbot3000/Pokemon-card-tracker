import React from 'react';

const LoadingSkeleton = () => (
  <div className="max-w-7xl mx-auto px-6 py-4 space-y-8">
    <div className="skeleton h-16 w-full rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton h-32 rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="skeleton h-64 rounded-xl" />
      ))}
    </div>
  </div>
);

export default LoadingSkeleton; 