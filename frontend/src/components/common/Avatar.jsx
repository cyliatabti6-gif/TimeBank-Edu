import { useEffect, useState } from 'react';

export default function Avatar({ initials, size = 'md', color = 'teal', src, altText }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const sizes = { xs: 'w-7 h-7 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' };
  const colors = {
    teal: 'bg-primary-100 text-primary-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-200 text-gray-600',
  };
  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={altText || initials || 'Photo de profil'}
        onError={() => setImgFailed(true)}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white shadow-sm`}
      />
    );
  }
  return (
    <div className={`${sizes[size]} ${colors[color] || colors.teal} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}
