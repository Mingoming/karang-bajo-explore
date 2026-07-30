type PublicContainerProps = Readonly<{
  children: React.ReactNode;
  className?: string;
}>;

export function PublicContainer({
  children,
  className = "",
}: PublicContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10 ${className}`}>
      {children}
    </div>
  );
}
