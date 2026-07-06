// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/components/ui/button.tsx
import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { jsx } from "react/jsx-runtime";
var buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tirbeo-crimson-400 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-tirbeo-crimson-600 text-white shadow hover:bg-tirbeo-crimson-700",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        outline: "border border-tirbeo-dark-300 bg-white shadow-sm hover:bg-tirbeo-dark-50 hover:text-tirbeo-dark-900",
        secondary: "bg-tirbeo-dark-100 text-tirbeo-dark-900 shadow-sm hover:bg-tirbeo-dark-200",
        ghost: "hover:bg-tirbeo-dark-100 hover:text-tirbeo-dark-900",
        link: "text-tirbeo-crimson-600 underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
var Button = forwardRef(
  ({ className, variant, size, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "button",
      {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        ...props
      }
    );
  }
);
Button.displayName = "Button";

// src/components/ui/card.tsx
import { forwardRef as forwardRef2 } from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var Card = forwardRef2(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2(
    "div",
    {
      ref,
      className: cn(
        "rounded-xl border border-tirbeo-dark-200 bg-white shadow-sm",
        className
      ),
      ...props
    }
  )
);
Card.displayName = "Card";
var CardHeader = forwardRef2(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2(
    "div",
    {
      ref,
      className: cn("flex flex-col space-y-1.5 p-6", className),
      ...props
    }
  )
);
CardHeader.displayName = "CardHeader";
var CardTitle = forwardRef2(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2(
    "h3",
    {
      ref,
      className: cn("font-heading text-lg font-semibold leading-none tracking-tight", className),
      ...props
    }
  )
);
CardTitle.displayName = "CardTitle";
var CardDescription = forwardRef2(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2(
    "p",
    {
      ref,
      className: cn("text-sm text-tirbeo-dark-500", className),
      ...props
    }
  )
);
CardDescription.displayName = "CardDescription";
var CardContent = forwardRef2(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2("div", { ref, className: cn("p-6 pt-0", className), ...props })
);
CardContent.displayName = "CardContent";
var CardFooter = forwardRef2(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2(
    "div",
    {
      ref,
      className: cn("flex items-center p-6 pt-0", className),
      ...props
    }
  )
);
CardFooter.displayName = "CardFooter";

// src/components/ui/input.tsx
import { forwardRef as forwardRef3 } from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var Input = forwardRef3(
  ({ className, type, ...props }, ref) => {
    return /* @__PURE__ */ jsx3(
      "input",
      {
        type,
        className: cn(
          "flex h-9 w-full rounded-md border border-tirbeo-dark-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-tirbeo-dark-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tirbeo-crimson-400 disabled:cursor-not-allowed disabled:opacity-50",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Input.displayName = "Input";

// src/components/ui/badge.tsx
import { cva as cva2 } from "class-variance-authority";
import { jsx as jsx4 } from "react/jsx-runtime";
var badgeVariants = cva2(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-tirbeo-crimson-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-tirbeo-crimson-600 text-white shadow hover:bg-tirbeo-crimson-700",
        secondary: "border-transparent bg-tirbeo-dark-100 text-tirbeo-dark-900 hover:bg-tirbeo-dark-200",
        destructive: "border-transparent bg-red-600 text-white shadow hover:bg-red-700",
        outline: "text-tirbeo-dark-950",
        gold: "border-transparent bg-tirbeo-gold-500 text-white shadow hover:bg-tirbeo-gold-600"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({ className, variant, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: cn(badgeVariants({ variant }), className), ...props });
}

// src/components/theme/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { jsx as jsx5 } from "react/jsx-runtime";
var ThemeProviderContext = createContext(void 0);
function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "tirbeo-theme",
  ...props
}) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(storageKey) || defaultTheme;
    }
    return defaultTheme;
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
      return;
    }
    root.classList.add(theme);
  }, [theme]);
  const setTheme = (newTheme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };
  return /* @__PURE__ */ jsx5(ThemeProviderContext.Provider, { ...props, value: { theme, setTheme }, children });
}
function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === void 0) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
export {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  ThemeProvider,
  badgeVariants,
  buttonVariants,
  cn,
  useTheme
};
//# sourceMappingURL=index.mjs.map