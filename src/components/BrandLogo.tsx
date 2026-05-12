"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
    setMounted(true);
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