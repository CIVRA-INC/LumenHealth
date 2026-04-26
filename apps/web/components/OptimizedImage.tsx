/**
 * CHORD-069 – Image optimization and placeholder strategy.
 * Wraps Next.js <Image> with a blur placeholder and error fallback
 * so artist avatars, banners, and cover art load progressively.
 */
import Image, { ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK = "/images/placeholder.png";

type Props = Omit<ImageProps, "placeholder" | "blurDataURL"> & {
  fallbackSrc?: string;
};

export default function OptimizedImage({
  src,
  alt,
  fallbackSrc = FALLBACK,
  className = "",
  ...rest
}: Props) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);

  return (
    <span
      className={`relative inline-block overflow-hidden ${className}`}
      aria-label={alt}
    >
      {/* Low-quality shimmer shown until image loads */}
      {!loaded && (
        <span
          className="absolute inset-0 animate-pulse bg-gray-200"
          aria-hidden="true"
        />
      )}

      <Image
        {...rest}
        src={imgSrc}
        alt={alt}
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4="
        onLoad={() => setLoaded(true)}
        onError={() => {
          setImgSrc(fallbackSrc);
          setLoaded(true);
        }}
        style={{ objectFit: "cover", ...rest.style }}
      />
    </span>
  );
}
