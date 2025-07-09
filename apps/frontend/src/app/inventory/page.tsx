import { redirect } from 'next/navigation';

export default function InventoryRootPage() {
  redirect('/inventory/dashboard');
  return null;
}