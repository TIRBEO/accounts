"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ConsentRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    window.location.href = `/authorize?${params.toString()}`;
  }, [searchParams]);

  return null;
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentRedirect />
    </Suspense>
  );
}
