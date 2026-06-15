"use client";

import { useEffect } from "react";

// Opens the browser print dialog once the print view has rendered.
export default function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
