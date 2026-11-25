"use client";

import Link from "next/link";
import { MESSAGES } from "@/lib/messages";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-neutral-300 bg-white p-8 text-neutral-900">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
          {MESSAGES.errorPage.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-neutral-700">
          {MESSAGES.errorPage.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            {MESSAGES.common.retry}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-neutral-700 bg-white px-5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            {MESSAGES.common.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}
