import { HTMLAttributes } from "react";

interface SectionLabelProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: React.ReactNode;
}

export default function SectionLabel({
  className = "",
  children,
  ...props
}: SectionLabelProps) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-wide ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}
