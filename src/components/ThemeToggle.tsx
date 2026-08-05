"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";

const OPTIONS = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

interface ThemeToggleProps {
  collapsed?: boolean;
}

export default function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (collapsed) {
    const current = OPTIONS.find((o) => o.value === theme) || OPTIONS[2];
    const Icon = current.icon;
    return (
      <button
        onClick={() => {
          const idx = OPTIONS.findIndex((o) => o.value === theme);
          setTheme(OPTIONS[(idx + 1) % OPTIONS.length].value);
        }}
        title={`Theme: ${current.label}`}
        className="w-12 h-12 mx-auto flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Icon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="px-3 py-2">
      <p className="text-xs text-muted-foreground mb-2 font-medium">Theme</p>
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
