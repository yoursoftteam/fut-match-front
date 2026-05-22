import { Geist, Outfit, Space_Grotesk } from "next/font/google";

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
