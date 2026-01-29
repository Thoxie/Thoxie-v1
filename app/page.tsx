export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">THOXIE</h1>
      <p className="text-gray-600 mb-8">
        Family Law decision support. Not a law firm.
      </p>

      <div className="grid gap-4 max-w-xl">
        <a
          href="/ask"
          className="rounded-lg border p-4 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold">Ask THOXIE</h2>
          <p className="text-sm text-gray-600">
            General family-law questions and guidance
          </p>
        </a>
      </div>
    </main>
  );
}

