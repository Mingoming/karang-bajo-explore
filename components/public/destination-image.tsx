import Image from "next/image";

type DestinationImageProps = Readonly<{
  src: string | null;
  alt: string;
  sizes: string;
  highPriority?: boolean;
  className?: string;
}>;

export function DestinationImage({
  src,
  alt,
  sizes,
  highPriority = false,
  className = "",
}: DestinationImageProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-emerald-100 via-stone-100 to-amber-100 ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={highPriority ? "eager" : "lazy"}
          fetchPriority={highPriority ? "high" : "auto"}
          unoptimized
          className="object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center px-5 text-center"
          aria-hidden="true"
        >
          <span className="font-serif text-lg font-bold text-emerald-950/55">
            Karang Bajo Explore
          </span>
        </div>
      )}
    </div>
  );
}
