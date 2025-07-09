import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Order Form",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}