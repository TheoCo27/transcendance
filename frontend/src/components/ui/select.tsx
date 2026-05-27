import { ChevronDown } from "lucide-react";

type SelectProps = {
  className?: string;
  min: number;
  max: number;
} & React.ComponentPropsWithoutRef<"select">;

const Select = ({ className, min, max, ...props }: SelectProps) => {
  const options = [];
  for (let i = min; i <= max; i++) {
    options.push(
      <option key={i} value={i}>
        {i}
      </option>,
    );
  }
  return (
    <div className="relative w-full">
      <select
        className={`w-full appearance-none rounded-xl border border-white/10 bg-bg px-4 py-3 pr-11 placeholder:text-text/40 transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className ?? ""}`}
        {...props}
      >
        {options}
      </select>

      <ChevronDown
        aria-hidden="true"
        strokeWidth={2}
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white"
      />
    </div>
  );
};

export default Select;
