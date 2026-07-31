import Image from "next/image";

export function PublicMediaImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: Readonly<{
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}>) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-emerald-100 via-stone-100 to-amber-100 ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-5 text-center" aria-hidden="true">
          <span className="font-serif text-lg font-bold text-emerald-950/55">Karang Bajo Explore</span>
        </div>
      )}
    </div>
  );
}
