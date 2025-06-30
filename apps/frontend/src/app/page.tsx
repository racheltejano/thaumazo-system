import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Menu Bar */}
      <nav className="flex items-center justify-between bg-gray-900 text-white px-6 py-4 shadow">
        <div className="text-xl font-bold">Thaumazo Express</div>
        <div className="space-x-6">
          <Link href="/login" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Sign in</Link>
          <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Sign up</Link>
        </div>
      </nav>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-4">Thaumazo Express</h1>
        <p className="max-w-xl text-center text-lg text-gray-700">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nunc ut laoreet dictum, massa sapien dictum urna, nec dictum massa sapien dictum urna. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Suspendisse potenti. Etiam euismod, nunc ut laoreet dictum, massa sapien dictum urna, nec dictum massa sapien dictum urna.
        </p>
      </main>
    </div>
  );
}
