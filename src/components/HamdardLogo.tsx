"use client";
import React from "react";

interface HamdardLogoProps {
  className?: string;
}

export function HamdardLogo({ className = "w-32 h-32" }: HamdardLogoProps) {
  return (
    <svg viewBox="0 0 300 300" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hTopGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#005830", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#004620", stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="hBottomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#8DC63F", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#7AB035", stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Top arc swoosh */}
      <path
        d="M 60 100 Q 150 20, 240 100"
        fill="none"
        stroke="url(#hTopGradient)"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* Bottom arc swoosh */}
      <path
        d="M 240 200 Q 150 280, 60 200"
        fill="none"
        stroke="url(#hBottomGradient)"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* Inner decorative circle */}
      <circle cx="150" cy="150" r="75" fill="none" stroke="#005830" strokeWidth="1" opacity="0.2" />

      {/* HAMDARD Wordmark */}
      <text
        x="150"
        y="163"
        fontFamily="'Segoe UI', 'Helvetica Neue', sans-serif"
        fontSize="44"
        fontWeight="700"
        textAnchor="middle"
        fill="#005830"
        letterSpacing="-1"
      >
        HAMDARD
      </text>

      {/* Tagline */}
      <text
        x="150"
        y="268"
        fontFamily="'Segoe UI', 'Helvetica Neue', sans-serif"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
        fill="#8DC63F"
        letterSpacing="2.5"
      >
        WELLNESS TO WELLBEING
      </text>
    </svg>
  );
}
