import React from 'react';

interface PlayvearIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

/**
 * PlayvearIcon - Authentic PlayVear brand icon extracted directly from the official brand asset,
 * converted to WebP format, and compressed down to only 3.0 KB for ultra-fast performance.
 */
export const PlayvearIcon: React.FC<PlayvearIconProps> = ({
  className = 'w-4 h-4',
  alt = 'PlayVear',
  ...props
}) => {
  return (
    <img
      src="/playvear-icon.webp"
      alt={alt}
      loading="eager"
      decoding="async"
      className={`inline-block shrink-0 object-contain align-middle select-none pointer-events-none ${className}`}
      {...props}
    />
  );
};

export default PlayvearIcon;
