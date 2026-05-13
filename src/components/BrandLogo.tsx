"use client";

import Image from "next/image";
import { useTheme } from "@teispace/next-themes";
import { useState, useEffect } from "react";

interface BrandLogoProps {
  className?: string;
  width: number;
  height: number;
  priority?: boolean;
}

export function BrandLogo({ className, width, height, priority = false }: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <span className={className} style={{ display: "inline-block", width, height }} aria-hidden />;
  }

  const src = resolvedTheme === "light" ? "/p2-logo-black.png" : "/p2-logo.png";

  return (
    <Image
      src={src}
      alt="Parti2"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}