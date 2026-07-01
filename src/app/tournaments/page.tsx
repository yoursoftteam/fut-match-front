import type { Metadata } from "next"
import TournamentsExplorerClient from "./TournamentsExplorerClient"

export const metadata: Metadata = {
  title: "Torneos Abiertos | Parti2",
  description: "Explora torneos públicos y registra tu equipo.",
}

export default function TournamentsPage() {
  return <TournamentsExplorerClient />
}
