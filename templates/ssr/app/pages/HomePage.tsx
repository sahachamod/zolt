export default function HomePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-20 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-3xl">
        <p className="font-semibold text-brand-600">Zolt SSR preview</p>
        <h1 className="mt-4 text-5xl font-bold">A TSX application ready for the SSR adapter</h1>
        <p className="mt-6 text-slate-600 dark:text-slate-300">The 0.1 runtime renders client-side; production SSR remains experimental and is not enabled by this template.</p>
      </section>
    </main>
  );
}
