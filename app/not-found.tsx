import Link from "next/link";
import { MESSAGES } from "@/lib/messages";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-neutral-300 bg-white p-8 text-neutral-900">
        <p className="text-sm font-semibold text-neutral-700">{MESSAGES.notFound.code}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">
          {MESSAGES.notFound.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-neutral-700">
          {MESSAGES.notFound.description}
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            {MESSAGES.common.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}
