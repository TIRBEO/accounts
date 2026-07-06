import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-tirbeo-crimson-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-tirbeo-crimson-600 text-white shadow hover:bg-tirbeo-crimson-700",
        secondary:
          "border-transparent bg-tirbeo-dark-100 text-tirbeo-dark-900 hover:bg-tirbeo-dark-200",
        destructive:
          "border-transparent bg-red-600 text-white shadow hover:bg-red-700",
        outline: "text-tirbeo-dark-950",
        gold:
          "border-transparent bg-tirbeo-gold-500 text-white shadow hover:bg-tirbeo-gold-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
