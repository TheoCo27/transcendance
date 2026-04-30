interface EmptyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function EmptyCard({
  children,
  className,
  ...props
}: EmptyCardProps) {
  return (
    <div
      className={`mt-5 rounded-3xl border border-dashed border-white/18 bg-white/10 px-5 py-5 text-sm leading-7 text-white/75 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
