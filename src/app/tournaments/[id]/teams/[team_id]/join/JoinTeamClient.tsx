"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { type Tournament, type TournamentTeam } from "@/lib/tournament-schema"
import { ChevronLeft, Users, ShieldCheck, Check, FileText, Droplets, Heart, PhoneCall, Shirt } from "lucide-react"

interface JoinTeamClientProps {
  tournamentId: string
  teamId: string
}

export default function JoinTeamClient({ tournamentId, teamId }: JoinTeamClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [team, setTeam] = useState<TournamentTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [documentType, setDocumentType] = useState("CC")
  const [documentNumber, setDocumentNumber] = useState("")
  const [bloodType, setBloodType] = useState("")
  const [shirtNumber, setShirtNumber] = useState("")
  const [emergencyName, setEmergencyName] = useState("")
  const [emergencyPhone, setEmergencyPhone] = useState("")
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState("")
  const [shirtNumberError, setShirtNumberError] = useState("")
  const [takenNumbers, setTakenNumbers] = useState<number[]>([])

  useEffect(() => {
    const fetch = async () => {
      const [tResult, teamResult] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase.from("tournament_teams").select("*").eq("id", teamId).maybeSingle(),
      ])
      if (tResult.data) setTournament(tResult.data as Tournament)
      if (teamResult.data) setTeam(teamResult.data as TournamentTeam)

      const { data: taken } = await supabase
        .from("tournament_team_players")
        .select("shirt_number")
        .eq("team_id", teamId)
        .not("shirt_number", "is", null)
      if (taken) setTakenNumbers(taken.map((r) => r.shirt_number).filter((n): n is number => n !== null))

      if (!authLoading && user?.user_metadata) {
        const meta = user.user_metadata as Record<string, unknown>
        if (meta.name) setName(meta.name as string)
        if (meta.phone) setPhone(meta.phone as string)
        if (meta.document_type) setDocumentType(meta.document_type as string)
        if (meta.document_number) setDocumentNumber(meta.document_number as string)
        if (meta.blood_type) setBloodType(meta.blood_type as string)
        if (meta.shirt_number) setShirtNumber(meta.shirt_number as string)
        if (meta.emergency_contact_name) setEmergencyName(meta.emergency_contact_name as string)
        if (meta.emergency_contact_phone) setEmergencyPhone(meta.emergency_contact_phone as string)
      }
      setLoading(false)
    }
    void fetch()
  }, [tournamentId, teamId, authLoading, user])

  const handleJoin = async () => {
    if (!user || !name.trim()) return
    setError("")
    setShirtNumberError("")
    setJoining(true)

    if (shirtNumber) {
      const num = parseInt(shirtNumber, 10)
      const { data: existing } = await supabase
        .from("tournament_team_players")
        .select("id")
        .eq("team_id", teamId)
        .eq("shirt_number", num)
        .maybeSingle()
      if (existing) {
        setShirtNumberError(`El número ${num} ya está asignado a otro jugador de este equipo.`)
        setJoining(false)
        return
      }
    }

    const { error: insertError } = await supabase.from("tournament_team_players").insert({
      team_id: teamId,
      user_id: user.id,
      name: name.trim(),
      phone: phone.trim() || null,
      email: user.email ?? null,
      document_type: documentType,
      document_number: documentNumber.trim() || null,
      blood_type: bloodType || null,
      shirt_number: shirtNumber ? parseInt(shirtNumber, 10) : null,
      emergency_contact_name: emergencyName.trim() || null,
      emergency_contact_phone: emergencyPhone.trim() || null,
    })

    setJoining(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    await supabase.auth.updateUser({
      data: {
        name: name.trim(),
        phone: phone.trim() || null,
        document_type: documentType,
        document_number: documentNumber.trim() || null,
        blood_type: bloodType || null,
        shirt_number: shirtNumber ? parseInt(shirtNumber, 10) : null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
      },
    })
    setJoined(true)
    setTimeout(() => router.push(`/tournaments/${tournamentId}`), 1500)
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
          <div className="card p-5 space-y-3">
            <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded-lg bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md card p-6 text-center">
          <p className="text-lg font-heading font-bold text-foreground">Inicia sesión</p>
          <p className="mt-1 text-sm text-muted-foreground">Debes iniciar sesión para unirte al equipo.</p>
          <Link
            href={`/auth?redirect=/tournaments/${tournamentId}/teams/${teamId}/join`}
            className="btn-primary-fm mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  if (!tournament || !team) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md card p-6 text-center">
          <p className="text-lg font-heading font-bold text-foreground">Link inválido</p>
          <p className="mt-1 text-sm text-muted-foreground">El torneo o equipo no existe.</p>
          <Link href="/tournaments" className="mt-4 inline-block text-sm text-primary hover:text-primary/80">
            Ver torneos
          </Link>
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md card p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-500/10">
            <Check className="size-6 text-green-500" />
          </div>
          <p className="mt-3 text-lg font-heading font-bold text-foreground">¡Te uniste a {team.name}!</p>
          <p className="mt-1 text-sm text-muted-foreground">Redirigiendo al torneo...</p>
        </div>
      </div>
    )
  }

  const isAlreadyMember = user.email
    ? team.captain_email === user.email
    : false

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-md space-y-4 px-4 py-6">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Volver al torneo
        </Link>

        <div className="card p-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-6 text-primary" />
          </div>

          <h1 className="mt-4 text-xl font-heading font-bold text-foreground">Unirte a {team.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Torneo: {tournament.name}
          </p>

          {tournament.status !== "open" && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              Este torneo ya no acepta inscripciones.
            </div>
          )}

          {isAlreadyMember && (
            <div className="mt-4 rounded-lg bg-primary/10 p-3 text-sm text-primary">
              Eres el capitán de este equipo.
            </div>
          )}

          {tournament.status === "open" && !isAlreadyMember && (
              <div className="mt-6 space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                )}

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Datos personales</p>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Teléfono *</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Tipo doc. *</label>
                      <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="NIT">NIT</option>
                        <option value="Pasaporte">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Número de documento *</label>
                      <input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Número de documento" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Grupo sanguíneo *</label>
                    <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                      <option value="">Selecciona tu grupo</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Número de camiseta *</label>
                    <input
                      value={shirtNumber}
                      onChange={(e) => { setShirtNumber(e.target.value.replace(/\D/g, '').slice(0, 3)); setShirtNumberError("") }}
                      placeholder="Ej: 10"
                      inputMode="numeric"
                      maxLength={3}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary bg-background ${
                        shirtNumberError ? "border-red-500" : "border-border"
                      }`}
                    />
                    {shirtNumberError && (
                      <p className="mt-1 text-xs text-red-500">{shirtNumberError}</p>
                    )}
                    {takenNumbers.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground/70">Ocupados:</span>
                        {takenNumbers.sort((a, b) => a - b).map((num) => (
                          <span
                            key={num}
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
                              shirtNumber === String(num)
                                ? "bg-red-500/15 text-red-500 ring-1 ring-red-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-border" />

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contacto de emergencia</p>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Nombre del contacto *</label>
                    <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Nombre del contacto" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Teléfono del contacto *</label>
                    <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="Teléfono del contacto" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                </div>

                <button
                  onClick={handleJoin}
                  disabled={joining || !name.trim() || !phone.trim() || !documentNumber.trim() || !bloodType || !shirtNumber || !emergencyName.trim() || !emergencyPhone.trim()}
                  className="btn-primary-fm inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50"
                >
                  <ShieldCheck className="size-4" />
                  {joining ? "Uniendo..." : "Unirse al equipo"}
                </button>
              </div>
          )}
        </div>
      </main>
    </div>
  )
}
