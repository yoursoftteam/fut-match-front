import type { Metadata } from "next"
import NewTournamentClient from "./NewTournamentClient"

export const metadata: Metadata = {
  title: "Crear Torneo | Parti2",
  description: "Configura tu torneo en pasos y comparte links dinámicos para inscripción y pago.",
}

export default function NewTournamentPage() {
  return <NewTournamentClient />
}
