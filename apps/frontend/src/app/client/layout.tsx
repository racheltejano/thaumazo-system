// src/app/client/layout.tsx
import React from 'react'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Portal",
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
} 