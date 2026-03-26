"use client";

export const UnauthorizedNotice = ({
  title = "Access Restricted",
  message,
}: {
  title?: string;
  message: string;
}) => (
  <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
    <h2 className="text-base font-semibold text-amber-900">{title}</h2>
    <p className="mt-1">{message}</p>
  </section>
);
