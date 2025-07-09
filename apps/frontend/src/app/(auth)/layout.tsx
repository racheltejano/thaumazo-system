// src/app/(auth)/layout.tsx
import Image from 'next/image'
import React from 'react'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login Page",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white flex flex-col md:flex-row items-center justify-center p-6">
      {/* LEFT SIDE: Logo + content box */}
      <div className="w-full md:w-1/2 max-w-md space-y-6">
        <div className="flex flex-col items-center">
          <Image src="/texts-logo.png" alt="TEXTS Logo" width={300} height={100} className="mb-2 select-none" />
          <p className="text-sm text-gray-600 -mt-2 text-center select-none">
            <span className="font-bold text-orange-500">T</span>haumazo{' '}
            <span className="font-bold text-orange-500">EX</span>press{' '}
            <span className="font-bold text-orange-500">T</span>ransport{' '}
            <span className="font-bold text-orange-500">S</span>olutions{' '}
          </p>
        </div>

        <div className="bg-white border rounded-lg shadow p-6 select-none">
          {children}
        </div>
      </div>

      {/* RIGHT SIDE: Avatar image */}
      <div className="hidden md:flex md:w-1/2 justify-center items-center">
        <Image
          src="/texts-avatars.png"
          alt="TEXTS Team Avatars"
          width={900}
          height={700}
          className="object-contain"
        />
      </div>
    </main>
  )
}
