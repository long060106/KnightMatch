"use client";

import { useEffect } from "react";
import { startAccountSync } from "@/lib/account-sync";

/** Mounted once in the layout while accounts are on; keeps this browser and the account in step. */
export function AccountSync() {
  useEffect(() => startAccountSync(), []);
  return null;
}
