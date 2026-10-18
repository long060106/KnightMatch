"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The list used to live on the home page, so old shared links look like `/?topic=…` or
 * `/#projects`. Send those on to /projects with their filters intact.
 */
export function LegacyListRedirect() {
  const router = useRouter();
  useEffect(() => {
    const { search, hash } = window.location;
    if (search || hash === "#projects") router.replace(`/projects${search}`);
  }, [router]);
  return null;
}
