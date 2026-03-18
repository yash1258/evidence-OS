"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThemedSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface ThemedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  label?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  minMenuWidthClassName?: string;
}

export function ThemedSelect({
  value,
  onChange,
  options,
  label,
  className,
  buttonClassName,
  menuClassName,
  align = "left",
  minMenuWidthClassName = "min-w-[180px]",
}: ThemedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value]
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "app-chip flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-all hover:border-orange-200 hover:text-stone-800",
          isOpen && "border-orange-300 text-stone-800 shadow-[0_10px_26px_-20px_rgba(199,106,46,0.5)]",
          buttonClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {label ? (
          <span className="text-[10px] uppercase font-mono text-stone-500 font-semibold">
            {label}
          </span>
        ) : null}
        <span className="truncate text-sm font-medium text-stone-800">
          {selected?.label ?? value}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-stone-400 transition-transform",
            isOpen && "rotate-180 text-orange-600"
          )}
        />
      </button>

      {isOpen ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.55rem)] z-50 rounded-2xl border border-stone-200/80 bg-[rgba(255,252,247,0.98)] p-2 shadow-[0_24px_50px_-28px_rgba(77,52,22,0.45)] backdrop-blur-xl",
            minMenuWidthClassName,
            align === "right" ? "right-0" : "left-0",
            menuClassName
          )}
        >
          <div role="listbox" className="flex flex-col gap-1">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-orange-50 text-orange-900"
                      : "hover:bg-[rgba(255,247,237,0.72)] text-stone-700"
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{option.label}</div>
                    {option.description ? (
                      <div className="mt-0.5 text-[11px] text-stone-500">
                        {option.description}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      active
                        ? "border-orange-200 bg-white text-orange-700"
                        : "border-transparent text-transparent"
                    )}
                  >
                    <Check size={12} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
