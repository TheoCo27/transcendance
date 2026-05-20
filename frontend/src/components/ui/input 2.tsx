import { forwardRef } from "react";

type InputProps = {
  className?: string;
  type?: string;
} & React.ComponentPropsWithRef<"input">;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`rounded-xl border border-white/10 bg-bg px-4 py-3 placeholder:text-text/40 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${className}`}
        type={type}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export default Input;
