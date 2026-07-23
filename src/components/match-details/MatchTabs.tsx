"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { useMatchDetailsContext, type PlayerRegistration } from "@/contexts/MatchDetailsContext";
import { useMatchRegistration, useMatchUnregister } from "@/hooks/useMatchRegistration";
import { useMatchPricing, MAX_SUBSTITUTE_SLOTS } from "@/hooks/useMatchPricing";
import { useMatches } from "@/hooks/useMatches";
import { formatCurrency } from "@/lib/currency";
import { getPayingPlayersCount, getTotalCost } from "@/lib/match-pricing";
import { POSITIONS, type PositionOption } from "@/lib/positions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ShareActions } from "@/components/ShareLink";
import { PaymentStatus } from "./PaymentStatus";
import { PaymentSummary } from "./PaymentSummary";

import { buildMatchShareSummary } from "@/lib/convocatoria-format";
import RulesModal from "./RulesModal";

type PanelTab = "register" | "players" | "teams";

interface MatchTabsProps {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onOpenTeams?: () => void;
}

export function MatchTabs({ activeTab, onTabChange, onOpenTeams }: MatchTabsProps) {
  const { isCreator } = useMatchDetailsContext();
  useMatchPricing();

  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Secciones del partido">
      <button
        type="button"
        role="tab"
        id="tab-register"
        aria-selected={activeTab === "register"}
        aria-controls="panel-register"
        tabIndex={activeTab === "register" ? 0 : -1}
        onClick={() => onTabChange("register")}
        className={`rounded px-3 py-1.5 text-sm font-semibold transition ${activeTab === "register" ? "bg-green-600 text-white" : "bg-muted text-foreground border border-border hover:bg-secondary"}`}
      >
        Inscripción
      </button>
      <button
        type="button"
        role="tab"
        id="tab-players"
        aria-selected={activeTab === "players"}
        aria-controls="panel-players"
        tabIndex={activeTab === "players" ? 0 : -1}
        onClick={() => onTabChange("players")}
        className={`rounded px-3 py-1.5 text-sm font-semibold transition ${activeTab === "players" ? "bg-green-600 text-white" : "bg-muted text-foreground border border-border hover:bg-secondary"}`}
      >
        Jugadores
      </button>
      {isCreator && (
        <button
          type="button"
          role="tab"
          id="tab-teams"
          aria-selected={activeTab === "teams"}
          aria-controls="panel-teams"
          tabIndex={activeTab === "teams" ? 0 : -1}
          onClick={onOpenTeams}
          className={`rounded px-3 py-1.5 text-sm font-semibold transition ${activeTab === "teams" ? "bg-blue-600 text-white" : "bg-muted text-foreground border border-border hover:bg-secondary"}`}
        >
          Equipos
        </button>
      )}
    </div>
  );
}

export function RegistrationPanel() {
  const { matchData, registrations, isCreator, user, matchId, refreshRegistrations } = useMatchDetailsContext();
  const {
    entries,
    loading,
    message,
    showForm,
    setShowForm,
    addEntry,
    removeEntry,
    updateEntryName,
    updateEntryGoalkeeper,
    updateEntryPosition,
    handleSubmit,
    handleEntryKeyDown,
    resetForm,
  } = useMatchRegistration();
  const {
    isTitularFull,
    isSubstituteFull,
    isFieldPlayerFull,
    goalkeepersRemaining,
    maxGoalkeepers,
    maxFieldPlayers,
    goalkeepersCount,
    fieldPlayersCount,
    formattedDate,
    formattedTime,
  } = useMatchPricing();
  const { registerForMatch, unregisterFromMatch } = useMatches();
  const previousEntryIdsRef = useRef<string[]>([]);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [quickActionLoading, setQuickActionLoading] = useState(false);
  const [quickActionMessage, setQuickActionMessage] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [quickPosition, setQuickPosition] = useState<string>("");

  const userPosition = user?.user_metadata?.position as string | undefined;
  useEffect(() => {
    if (!userPosition || quickPosition) return;
    setQuickPosition(userPosition);
  }, [userPosition]); // run once on mount



  const totalGoalkeepersRegistered = registrations.filter((registration) => registration.is_goalkeeper).length;
  const selectedGoalkeepersInForm = entries.filter((entry) => entry.position === "portero").length;
  const isGoalkeeperCheckboxDisabled = totalGoalkeepersRegistered >= maxGoalkeepers;
  const goalkeeperSelectionLimitReached = totalGoalkeepersRegistered + selectedGoalkeepersInForm >= maxGoalkeepers;
  const gkSlotsFull = isGoalkeeperCheckboxDisabled || goalkeeperSelectionLimitReached;
  const totalCost = matchData
    ? getTotalCost(matchData.field_cost, matchData.rental_cost, matchData.has_rented_goalkeepers)
    : 0;
  const payingPlayers = matchData
    ? getPayingPlayersCount(
        matchData.max_players,
        matchData.has_rented_goalkeepers,
        matchData.rented_goalkeepers_count,
      )
    : 0;
  const costPerPlayer = payingPlayers > 0 ? Math.ceil(totalCost / payingPlayers) : 0;
  const shareableLink =
    typeof window !== "undefined" && matchData
      ? `${window.location.origin}/match/${matchData.id}`
      : "";
  const shareMatchSummary =
    matchData && shareableLink
      ? buildMatchShareSummary(matchData, shareableLink)
      : shareableLink;

  const normalizedAuthName = useMemo(() => {
    if (!user) return null;

    const metadata = user.user_metadata as { alias?: string; full_name?: string; name?: string } | null;

    const alias = metadata?.alias?.trim();
    if (alias && alias.length >= 2) return alias;

    const fullName = metadata?.full_name?.trim();
    const firstName = fullName?.split(' ')[0]?.trim();
    if (firstName && firstName.length >= 2) return firstName;

    const fallbackName = metadata?.name?.trim();
    if (fallbackName && fallbackName.length >= 2) return fallbackName;

    const emailName = user.email?.split("@")[0]?.trim();
    return emailName && emailName.length >= 2 ? emailName : null;
  }, [user]);

  const ownRegistration = useMemo(() => {
    if (!user) return null;

    const fallbackName = normalizedAuthName?.toLowerCase();
    return registrations.find((registration) => {
      if (registration.user_id && registration.user_id === user.id) {
        return true;
      }

      if (!registration.user_id && fallbackName) {
        return registration.name.trim().toLowerCase() === fallbackName;
      }

      return false;
    }) ?? null;
  }, [registrations, user, normalizedAuthName]);

  const useQuickAuthRegistration = Boolean(user && normalizedAuthName);

  const selectedPositionAbbr = quickPosition
    ? (POSITIONS as readonly PositionOption[]).find((p) => p.value === quickPosition)?.abbr ?? null
    : null;

  useEffect(() => {
    const currentIds = entries.map((entry) => entry.id);
    const addedId = currentIds.find((id) => !previousEntryIdsRef.current.includes(id));

    if (addedId) {
      requestAnimationFrame(() => {
        const input = document.getElementById(`register-fullname-${addedId}`) as HTMLInputElement | null;
        input?.focus();
      });
    }

    previousEntryIdsRef.current = currentIds;
  }, [entries]);

  useEffect(() => {
    if (!showShareToast) return;

    const timeoutId = window.setTimeout(() => {
      setShowShareToast(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showShareToast]);

  useEffect(() => {
    if (!quickActionMessage) return;

    const timeoutId = window.setTimeout(() => {
      setQuickActionMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [quickActionMessage]);

  useEffect(() => {
    if (!gkSlotsFull || quickPosition !== "portero") return;
    setQuickPosition("");
  }, [gkSlotsFull, quickPosition]);

  const handleSubmitWithToast = async (e: React.FormEvent) => {
    const success = await handleSubmit(e);
    if (success) {
      setShowShareToast(true);
      if (matchData?.rules) setShowRulesModal(true);
    }
  };

  const handleQuickAction = async () => {
    if (!matchData || !user || !normalizedAuthName) return;

    setQuickActionLoading(true);
    setQuickActionMessage(null);

    try {
      if (ownRegistration) {
        const { error } = await unregisterFromMatch(ownRegistration.id);
        if (error) {
          const msg = error instanceof Error ? error.message : "No se pudo completar la baja.";
          setQuickActionMessage(msg);
          return;
        }

        await refreshRegistrations();
        setQuickActionMessage("Te bajaste del partido correctamente.");
        return;
      }

      const normalizedNameLower = normalizedAuthName.toLowerCase();
      const hasNameCollision = registrations.some(
        (r) => r.name.trim().toLowerCase() === normalizedNameLower,
      );

      let finalName = normalizedAuthName;
      if (hasNameCollision) {
        const metadata = user.user_metadata as { full_name?: string } | null;
        const fullName = metadata?.full_name?.trim();
        if (fullName && fullName.split(" ").length > 1) {
          if (registrations.some((r) => r.name.trim().toLowerCase() === fullName.toLowerCase())) {
            setQuickActionMessage(
              `Ya hay un jugador inscrito como "${fullName}". Contacta al organizador para resolverlo.`,
            );
            return;
          }
          finalName = fullName;
        } else {
          setQuickActionMessage(
            "Ya hay un jugador inscrito con ese nombre. Para evitar confusiones, actualiza tu perfil para incluir tu apellido.",
          );
          return;
        }
      }

      if (!quickPosition) {
        setQuickActionMessage("Seleccioná una posición en la cancha antes de inscribirte.");
        return;
      }
      if (quickPosition === "portero" && gkSlotsFull) {
        setQuickActionMessage("Los cupos de portero ya están ocupados. Elegí otra posición para inscribirte.");
        return;
      }
      const { error } = await registerForMatch(matchId, finalName, quickPosition === "portero", {
        trackCurrentUser: true,
        position: quickPosition || undefined,
      });
      if (error) {
        const msg = error instanceof Error ? error.message : "No se pudo completar la inscripción.";
        setQuickActionMessage(msg);
        return;
      }

      await refreshRegistrations();
      setShowShareToast(true);
      setQuickActionMessage("¡Inscripción completada con tu cuenta!");
      if (matchData.rules) setShowRulesModal(true);
    } finally {
      setQuickActionLoading(false);
    }
  };

  return (
    <>
    <div id="panel-register" role="tabpanel" aria-labelledby="tab-register">
      <h2 className="mb-2 text-xl font-bold text-foreground">Inscribirme al partido</h2>
      <p className="mb-4 text-sm text-muted-foreground">Puedes inscribir varios jugadores. Presiona Enter para crear otra fila.</p>
      {isCreator && (
        <div
          className={`mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isGoalkeeperCheckboxDisabled ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40" : "bg-muted text-muted-foreground ring-1 ring-border"}`}
        >
          {isGoalkeeperCheckboxDisabled
            ? "Cupos de portero completos"
            : `Cupos de portero disponibles: ${Math.max(0, maxGoalkeepers - totalGoalkeepersRegistered)}`}
        </div>
      )}
      <div className="mb-4 rounded border border-border bg-muted p-3 text-sm text-muted-foreground">
        <p>Jugadores de campo: {fieldPlayersCount}/{maxFieldPlayers}</p>
        <p>Arqueros: {totalGoalkeepersRegistered}/{maxGoalkeepers}</p>
        <p className="mt-1 text-green-400">Cupos disponibles para arqueros: {Math.max(0, maxGoalkeepers - totalGoalkeepersRegistered)}</p>
        {isGoalkeeperCheckboxDisabled && (
          <p className="mt-1 text-amber-400">Ya se completaron los cupos de portero. El check está deshabilitado.</p>
        )}

        {matchData && (
          <>
            <button
              type="button"
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              aria-expanded={detailsExpanded}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-2"
            >
              {detailsExpanded ? "Ocultar detalles ▲" : "Ver detalles ▼"}
            </button>

            {detailsExpanded && (
              <div className="mt-3 border-t border-border pt-3">
                <p>Lugar: {matchData.location || "Por definir"}</p>
                <p className="mt-1">Fecha: {formattedDate}</p>
                <p className="mt-1">Hora: {formattedTime}</p>
                <p className="mt-1">Costo por jugador: {formatCurrency(costPerPlayer)}</p>
              </div>
            )}
          </>
        )}
      </div>

      {isTitularFull && !isSubstituteFull && (
        <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          Los cupos titulares ya están completos. Si te inscribes ahora, entrarás como suplente.
        </div>
      )}

      {isFieldPlayerFull && !isTitularFull && !isSubstituteFull && (
        <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          Los cupos de jugadores de campo están completos. Quedan cupos disponibles para arquero. Si te inscribes como jugador de campo, entrarás como suplente.
        </div>
      )}

      {isTitularFull && isSubstituteFull && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          Ya no hay cupos disponibles en este partido (ni titulares ni suplentes).
        </div>
      )}

      {message && (
        <div role="status" aria-live="polite" className={`mb-4 rounded p-3 text-sm ${message.includes("exitosamente") ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>
          {message}
        </div>
      )}

      {quickActionMessage && (
        <div role="status" aria-live="polite" className={`mb-4 rounded p-3 text-sm ${quickActionMessage.includes("complet") || quickActionMessage.includes("correctamente") ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>
          {quickActionMessage}
        </div>
      )}

      {user && !ownRegistration && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/[0.03] p-3">
          <div className="mb-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Tu puesto en la cancha
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(POSITIONS as readonly PositionOption[]).map((pos) => {
              const Icon = pos.icon;
              const isSelected = quickPosition === pos.value;
              const isPortero = pos.value === "portero";
              const gkSlotsFull = isGoalkeeperCheckboxDisabled || goalkeeperSelectionLimitReached;
              const gkFull = isPortero && gkSlotsFull;

              if (gkFull) {
                return (
                  <button
                    key={pos.value}
                    type="button"
                    disabled
                    style={{
                      border: "2px solid red",
                      backgroundColor: "#7f1d1d",
                      color: "white",
                      opacity: 0.7,
                      cursor: "not-allowed",
                      userSelect: "none",
                    }}
                    className="relative flex flex-col items-center gap-1.5 rounded-lg p-2.5 transition-all select-none"
                  >
                    <span
                      style={{
                        position: "absolute",
                        right: "-0.5rem",
                        top: "-0.5rem",
                        width: "1.25rem",
                        height: "1.25rem",
                        borderRadius: "9999px",
                        backgroundColor: "#dc2626",
                        color: "white",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    >
                      ✕
                    </span>
                    <Icon className="size-5" aria-hidden="true" style={{ color: "white" }} />
                    <span className="text-[11px] font-semibold leading-tight">
                      {pos.abbr}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() => setQuickPosition(pos.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all select-none ${
                    isSelected
                      ? "relative border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground hover:shadow-sm"
                  }`}
                >
                  <Icon className={`size-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                  <span className={`text-[11px] font-semibold leading-tight ${isSelected ? "text-primary" : ""}`}>
                    {pos.abbr}
                  </span>
                </button>
              );
            })}
          </div>
          {gkSlotsFull && (
            <div className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300">
              Los cupos de portero ya están ocupados. Si queres inscribirte, elegí otra posición en la cancha.
            </div>
          )}
        </div>
      )}

      {useQuickAuthRegistration && (
        <button
          type="button"
          onClick={handleQuickAction}
          className={`w-full rounded py-2 px-4 font-semibold transition ${
            ownRegistration
              ? "bg-red-600 text-white hover:bg-red-700"
              : !quickPosition
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : (isTitularFull || isFieldPlayerFull) && !isSubstituteFull
                  ? "bg-amber-500 text-foreground hover:bg-amber-600"
                  : isTitularFull && isSubstituteFull
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-green-500 text-white hover:bg-green-600"
          }`}
          disabled={quickActionLoading || (!ownRegistration && (!quickPosition || isTitularFull && isSubstituteFull))}
        >
          {quickActionLoading
            ? (ownRegistration ? "Procesando baja..." : "Inscribiendo...")
            : ownRegistration
              ? "Cancelar inscripción"
              : (isTitularFull && isSubstituteFull
                  ? "Sin cupos disponibles"
                  : (isTitularFull || isFieldPlayerFull)
                    ? selectedPositionAbbr
                      ? `Inscribirme como ${selectedPositionAbbr} suplente`
                      : "Inscribirme como suplente"
                    : selectedPositionAbbr
                      ? `Inscribirme como ${selectedPositionAbbr}`
                      : "Inscribirme")}
        </button>
      )}

      {!showForm ? (
        useQuickAuthRegistration ? (
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className={`mt-3 w-full rounded py-2 px-4 font-semibold transition ${
                isTitularFull && isSubstituteFull
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : (isTitularFull || isFieldPlayerFull)
                    ? "bg-amber-500 text-foreground hover:bg-amber-600"
                    : "border border-border bg-muted text-foreground hover:bg-secondary"
              }`}
              disabled={isTitularFull && isSubstituteFull}
            >
              {isTitularFull && isSubstituteFull
                ? "Sin cupos disponibles"
                : (isTitularFull || isFieldPlayerFull)
                  ? "Inscribir a otros como suplentes"
                  : "Inscribir a otros"}
            </button>
        ) : (
          <>
            {!user && (
              <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-start gap-2.5">
                  <Zap className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">
                      Inscribite más rápido
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check size={12} className="shrink-0 text-primary" />
                        <span>Guardá tu posición favorita</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check size={12} className="shrink-0 text-primary" />
                        <span>Registrate con 1 click</span>
                      </li>
                    </ul>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Link
                        href="/auth?mode=signin"
                        className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
                      >
                        Iniciar sesión
                      </Link>
                      <Link
                        href="/auth?mode=signup"
                        className="inline-flex items-center rounded-md border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                      >
                        Crear cuenta
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className={`w-full rounded py-2 px-4 font-semibold transition ${(isTitularFull || isFieldPlayerFull) && !isSubstituteFull ? "bg-amber-500 text-foreground hover:bg-amber-600" : isTitularFull && isSubstituteFull ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-green-500 text-white hover:bg-green-600"}`}
              disabled={isTitularFull && isSubstituteFull}
            >
              {isTitularFull && isSubstituteFull
                ? "Sin cupos disponibles"
                : (isTitularFull || isFieldPlayerFull)
                  ? selectedPositionAbbr
                    ? `Inscribirme como ${selectedPositionAbbr} suplente`
                    : "Inscribirme como suplente"
                  : selectedPositionAbbr
                    ? `Inscribirme como ${selectedPositionAbbr}`
                    : "Inscribirme"}
            </button>
          </>
        )
      ) : (
        <form onSubmit={handleSubmitWithToast} className="space-y-4">
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div key={entry.id} className="rounded border border-border bg-muted p-3">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor={`register-fullname-${entry.id}`} className="text-sm font-medium text-foreground">
                    Jugador {index + 1}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="rounded p-1 text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
                    aria-label={`Quitar jugador ${index + 1}`}
                    disabled={entries.length === 1}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>

                <input
                  id={`register-fullname-${entry.id}`}
                  type="text"
                  autoComplete="name"
                  value={entry.name}
                  onChange={(e) => updateEntryName(entry.id, e.target.value)}
                  onKeyDown={(e) => handleEntryKeyDown(e, entry.id)}
                  className={`w-full rounded border bg-background px-4 py-3 text-foreground ${
                    entry.nameError ? "border-red-500" : "border-border"
                  }`}
                  placeholder="Ingresa el nombre..."
                  aria-invalid={!!entry.nameError}
                  aria-describedby={entry.nameError ? `register-name-error-${entry.id}` : undefined}
                />
                {entry.nameError && (
                  <div
                    id={`register-name-error-${entry.id}`}
                    className="mt-1.5 flex items-start gap-1.5 rounded-md border border-red-500/30 bg-red-950/40 px-2.5 py-1.5"
                    role="alert"
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
                    <p className="text-xs font-medium leading-snug text-red-300">
                      {entry.nameError}
                    </p>
                  </div>
                )}

                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.03] p-3">
                  <div className="mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Puesto en la cancha
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(POSITIONS as readonly PositionOption[]).map((pos) => {
                      const Icon = pos.icon;
                      const isSelected = entry.position === pos.value;
                      const isPortero = pos.value === "portero";
                      const gkFull = isPortero && gkSlotsFull;

                      if (gkFull) {
                        return (
                          <button
                            key={pos.value}
                            type="button"
                            disabled
                            style={{
                              border: "2px solid red",
                              backgroundColor: "#7f1d1d",
                              color: "white",
                              opacity: 0.7,
                              cursor: "not-allowed",
                              userSelect: "none",
                            }}
                            className="relative flex flex-col items-center gap-1.5 rounded-lg p-2.5 transition-all select-none"
                          >
                            <span
                              style={{
                                position: "absolute",
                                right: "-0.5rem",
                                top: "-0.5rem",
                                width: "1.25rem",
                                height: "1.25rem",
                                borderRadius: "9999px",
                                backgroundColor: "#dc2626",
                                color: "white",
                                fontSize: "0.625rem",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                              }}
                            >
                              ✕
                            </span>
                            <Icon className="size-5" aria-hidden="true" style={{ color: "white" }} />
                            <span className="text-[11px] font-semibold leading-tight">
                              {pos.abbr}
                            </span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => updateEntryPosition(entry.id, pos.value)}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all select-none ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground hover:shadow-sm"
                          }`}
                        >
                          <Icon className={`size-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                          <span className={`text-[11px] font-semibold leading-tight ${isSelected ? "text-primary" : ""}`}>
                            {pos.abbr}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {gkSlotsFull && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                Los cupos de portero ya están ocupados.
              </div>
            )}

            <button
              type="button"
              onClick={() => addEntry()}
              className="inline-flex items-center gap-2 rounded border border-dashed border-border bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <Plus size={14} aria-hidden />
              Agregar jugador
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className={`flex-1 rounded py-2 px-4 font-semibold text-white transition ${isTitularFull && isSubstituteFull ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-green-500 hover:bg-green-600"}`}
              disabled={loading || (isTitularFull && isSubstituteFull)}
            >
              {loading ? "Registrando..." : "Confirmar inscripciones"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="flex-1 rounded border border-border bg-muted py-2 px-4 font-medium text-foreground transition hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>

    {showRulesModal && matchData?.rules && (
      <RulesModal
        open={showRulesModal}
        rulesHtml={matchData.rules}
        onClose={() => setShowRulesModal(false)}
      />
    )}

    {showShareToast && (
      <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-border bg-card p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
        <p className="text-sm font-semibold text-foreground">Compartir partido</p>
        <p className="mt-1 text-xs text-muted-foreground">Inscripción exitosa. Comparte el link con más jugadores.</p>
        <div className="mt-3 h-1 overflow-hidden rounded bg-muted">
          <div className="toast-progress-bar h-full bg-primary" />
        </div>
        <div className="mt-3">
          <ShareActions
            copyText={shareMatchSummary}
            copiedStatusText="Información del partido copiada al portapapeles"
            whatsappText={shareMatchSummary}
            emailSubject={`Partido de fútbol${matchData?.location ? ` - ${matchData.location}` : ""}`}
            emailBody={shareMatchSummary}
            nativeShare={{
              title: `Partido${matchData?.location ? ` en ${matchData.location}` : " de fútbol"}`,
              text: shareMatchSummary,
              url: shareableLink,
            }}
          />
        </div>
      </div>
    )}

    <style jsx>{`
      .toast-progress-bar {
        width: 100%;
        transform-origin: left;
        animation: toast-countdown 5s linear forwards;
      }

      @keyframes toast-countdown {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }
    `}</style>
    </>
  );
}

function PositionEditInline({
  registration,
  onUpdate,
  gkSlotsFull,
}: {
  registration: PlayerRegistration;
  onUpdate: (position: string) => void;
  gkSlotsFull: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (registration.is_goalkeeper) {
    return <span className="inline-flex items-center gap-1">🥅 Portero</span>;
  }

  if (editing) {
    return (
      <span className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
        <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          {(POSITIONS as readonly PositionOption[]).map((pos) => {
            const Icon = pos.icon;
            const isActive = registration.position === pos.value;
            const isPortero = pos.value === "portero";
            const gkFull = isPortero && gkSlotsFull;

              const isBlocked = gkFull;
              return (
                <button
                  key={pos.value}
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    if (isBlocked) return;
                    onUpdate(pos.value);
                    setEditing(false);
                  }}
                  style={isBlocked ? {
                    border: "2px solid rgba(239, 68, 68, 0.7)",
                    backgroundColor: "rgba(127, 29, 29, 0.5)",
                    color: "rgba(252, 165, 165, 1)",
                    opacity: 0.7,
                    cursor: "not-allowed",
                    userSelect: "none",
                    position: "relative" as const,
                  } : {}}
                  className={`relative inline-flex w-full items-center justify-center gap-2 rounded-md border-2 px-3 py-2 text-sm font-medium transition sm:w-auto sm:inline-flex sm:px-2 sm:py-1 sm:text-xs ${
                    isBlocked
                      ? "border-red-500 bg-red-900/60 text-red-300 opacity-70 cursor-not-allowed"
                      : isActive
                        ? "border-primary bg-primary/20 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {isBlocked && (
                    <span
                      style={{
                        position: "absolute",
                        right: "-0.375rem",
                        top: "-0.375rem",
                        width: "1rem",
                        height: "1rem",
                        borderRadius: "9999px",
                        backgroundColor: "#dc2626",
                        color: "white",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    >
                      ✕
                    </span>
                  )}
                  <Icon className="size-4 shrink-0 sm:size-3" aria-hidden="true" />
                  {pos.abbr}
                  {isActive && <Check className="size-3 shrink-0" aria-hidden="true" />}
                </button>
              );
          })}
        </span>
        <div className="flex items-center gap-1 sm:self-center">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 sm:px-2 sm:py-1 sm:text-xs"
          >
            Cancelar
          </button>

        </div>
      </span>
    );
  }

  const p = (POSITIONS as readonly PositionOption[]).find((pos) => pos.value === registration.position);

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary transition hover:bg-primary/20"
    >
      {p ? (
        <>
          <p.icon className="size-3" aria-hidden="true" />
          {p.abbr}
        </>
      ) : (
        <>⚽ Sin posición</>
      )}
      <Pencil className="size-2.5 opacity-40" aria-hidden="true" />
    </button>
  );
}

export function PlayersPanel() {
  const { matchData, registrations, registrationsLoading, isCreator, user } = useMatchDetailsContext();
  const { updateRegistrationPosition } = useMatches();
  const { refreshRegistrations } = useMatchDetailsContext();
  const { showModal, target, loading, openModal, closeModal, handleUnregister, message } = useMatchUnregister();
  const { titulares, suplentes } = useMatchPricing();

  const totalGoalkeepersInMatch = registrations.filter((r) => r.is_goalkeeper).length;
  const maxGoalkeepersSlot = Math.min(2, matchData?.max_players ?? 0);
  const gkSlotsFull = totalGoalkeepersInMatch >= maxGoalkeepersSlot;

  const handlePositionUpdate = useCallback(async (registrationId: string, position: string) => {
    const { error } = await updateRegistrationPosition(registrationId, position);
    if (error) {
      console.error(error);
    } else {
      refreshRegistrations();
    }
  }, [updateRegistrationPosition, refreshRegistrations]);

  return (
    <>
    <div id="panel-players" role="tabpanel" aria-labelledby="tab-players">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">Jugadores inscritos ({registrations.length})</h2>
      </div>
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-3 rounded p-3 text-sm ${message.includes("correctamente") ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}
        >
          {message}
        </div>
      )}
      <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
        {registrationsLoading && (
          <p className="py-4 text-center text-muted-foreground">Cargando inscritos…</p>
        )}
        {titulares.length > 0 && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-400">Titulares ({titulares.length}/{matchData?.max_players})</p>
        )}
        {titulares.map((registration, index) => (
          <div key={registration.id} className="flex items-center justify-between rounded border border-border bg-muted p-2.5 transition hover:bg-muted">
            <div className="flex-1 min-w-0">
              <span className="mr-2 text-xs text-muted-foreground">#{index + 1}</span>
              <span className="font-medium text-foreground">{registration.name}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <PositionEditInline
                  registration={registration}
                  onUpdate={(position) => handlePositionUpdate(registration.id, position)}
                  gkSlotsFull={gkSlotsFull}
                />
              </span>
            </div>
            <div className="ml-3 flex items-center gap-2">
              {isCreator && (
                <PaymentStatus 
                  registrationId={registration.id}
                  hasPaid={registration.has_paid}
                  name={registration.name}
                />
              )}
              <button
                type="button"
                onClick={() => openModal(registration)}
                className="rounded p-1.5 text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
                title="Eliminar jugador"
                aria-label={`Eliminar a ${registration.name}`}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          </div>
        ))}

        {suplentes.length > 0 && (
          <>
            <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-amber-400">Suplentes ({suplentes.length}/{MAX_SUBSTITUTE_SLOTS})</p>
            {suplentes.map((registration, index) => (
              <div key={registration.id} className="flex items-center justify-between rounded border border-amber-800/40 bg-muted p-2.5 transition hover:bg-muted">
                <div className="flex-1 min-w-0">
                  <span className="mr-2 inline-flex items-center rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">S{index + 1}</span>
                  <span className="font-medium text-foreground">{registration.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PositionEditInline
                      registration={registration}
                      onUpdate={(position) => handlePositionUpdate(registration.id, position)}
                      gkSlotsFull={gkSlotsFull}
                    />
                  </span>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  {isCreator && (
                    <PaymentStatus 
                      registrationId={registration.id}
                      hasPaid={registration.has_paid}
                      name={registration.name}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => openModal(registration)}
                    className="rounded p-1.5 text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
                    title="Eliminar jugador"
                    aria-label={`Eliminar a ${registration.name}`}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {!registrationsLoading && registrations.length === 0 && (
          <p className="py-4 text-center text-muted-foreground">Aún no hay jugadores inscritos</p>
        )}
      </div>
      
      {isCreator && (
        <div className="mt-4">
          <PaymentSummary />
        </div>
      )}
    </div>

    <ConfirmDialog
      open={showModal}
      title="Eliminar jugador"
      description={
        target ? (
          <>¿Eliminar a <strong className="text-foreground">{target.name}</strong> del partido? Esta acción no se puede deshacer.</>
        ) : null
      }
      confirmLabel="Sí, eliminar"
      cancelLabel="Cancelar"
      destructive
      loading={loading}
      onConfirm={handleUnregister}
      onCancel={closeModal}
    />
    </>
  );
}