import { HTMLAttributes } from "react";

interface RoomSectionHeaderProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

export default function RoomSectionHeader({
  className = "",
  children,
  ...props
}: RoomSectionHeaderProps) {
  return (
    <h2
      className={`mt-3 text-2xl font-semibold text-text-muted ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
}
