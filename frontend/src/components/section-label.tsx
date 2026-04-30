import { HTMLAttributes } from "react";

interface RoomSectionLabelProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: React.ReactNode;
}

export default function SectionLabel({
  className = "",
  children,
  ...props
}: RoomSectionLabelProps) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-wide ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}
