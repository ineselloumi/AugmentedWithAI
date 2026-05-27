"use client";

import { useRef, useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSelectRole: (role: string) => void;
  quickRoles: string[];
  isLoading: boolean;
}

export default function SearchBar({ value, onChange, onSubmit, onSelectRole, quickRoles, isLoading }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showDropdown = focused && !isLoading && quickRoles.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        inputRef.current?.blur();
        onSubmit();
      }}
      className="relative w-full"
    >
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 z-10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Type your job title..."
        disabled={isLoading}
        className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-neutral-800/70 border border-neutral-700 text-white placeholder-neutral-500 text-base focus:outline-none focus:ring-2 focus:ring-neutral-600 disabled:opacity-60"
      />
      {showDropdown && (
        <ul className="absolute z-20 top-full mt-2 w-full bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-xl">
          <li className="px-4 pt-3 pb-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider select-none">Frequent searches</li>
          {quickRoles.map((role) => (
            <li key={role}>
              <button
                type="button"
                onMouseDown={() => { inputRef.current?.blur(); onSelectRole(role); }}
                className="w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                {role}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
