import { HTMLAttributes } from "react";

interface SectionHeaderProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

export default function SectionHeader({
  className = "",
  children,
  ...props
}: SectionHeaderProps) {
  return (
    <h2
      className={`mt-3 text-2xl font-semibold text-text-muted ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
}
