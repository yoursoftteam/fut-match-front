"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { MatchDetailsProvider, useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { MatchInfoSidebar, MatchEditForm, MatchTabs, RegistrationPanel, PlayersPanel, TeamBuilder } from "@/components/match-details";
import { MatchShareSection } from "@/components/match-details/MatchShareSection";
import { useMatchPricing } from "@/hooks/useMatchPricing";
import { useMatchEditing } from "@/hooks/useMatchEditing";
import { useMatchPushSubscription } from "@/hooks/useMatchPushSubscription";

type PanelTab = "register" | "players" | "teams";

function MatchDetailsInner({ editParam }: { editParam?: string | null }) {
  const { loading, error, matchData, isCreator, matchId, registrations } = useMatchDetailsContext();
  useMatchPricing();
  const editing = useMatchEditing();
  useMatchPushSubscription(matchData ? matchId : null);

  useEffect(() => {
    if (editParam === 'rules' && isCreator && matchData) {
      editing.openForm();
    }
  }, [editParam, isCreator, matchData, editing]);

  const [activeTab, setActiveTab] = useState<PanelTab>("register");
  const [showTeamBuilder, setShowTeamBuilder] = useState(false);

  if (loading) {
    return <div className="text-center py-8">Cargando detalles del partido…</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!matchData) {
    return <div className="text-center py-8">No se encontró información del partido</div>;
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen py-10 px-4 text-foreground">
        <div className="mx-auto w-full max-w-2xl">
          <div className="card match-card space-y-6 rounded-2xl border border-border/80 bg-card p-5 shadow-lg sm:p-6">
            <RegistrationPanel />

            <div className="border-t border-border/80 pt-6">
              <MatchShareSection matchData={matchData} registrations={registrations} />
            </div>

            <div className="border-t border-border/80 pt-6">
              <PlayersPanel />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 text-foreground">
      <div className="mx-auto w-full max-w-7xl">
        {isCreator && !matchData.rules && !editing.showForm && (
          <button
            type="button"
            onClick={() => editing.openForm()}
            className="mb-6 flex w-full cursor-pointer items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-400 transition hover:bg-amber-500/15"
          >
            <span className="size-2 rounded-full bg-amber-400 shrink-0" aria-hidden />
            <span className="flex-1 text-left">Este partido no tiene reglas configuradas — agrégalas ahora</span>
            <ChevronRight className="size-4 shrink-0" />
          </button>
        )}

        <div className="grid w-full gap-6 lg:grid-cols-[320px_1fr]">
        <MatchInfoSidebar
          editing={editing}
          onOpenTeamBuilder={() => { setShowTeamBuilder(true); setActiveTab("teams"); }}
        />

        <section className="space-y-6">
          <MatchEditForm editing={editing} />

          <div className="card match-card rounded-2xl border border-border/80 bg-card p-5 shadow-lg sm:p-6">
            <MatchTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOpenTeams={() => { setShowTeamBuilder(true); setActiveTab("teams"); }}
            />

            {activeTab === "register" && <RegistrationPanel />}
            {activeTab === "players" && <PlayersPanel />}
            {activeTab === "teams" && isCreator && (
              <TeamBuilder
                show={showTeamBuilder}
                onOpen={() => setShowTeamBuilder(true)}
              />
            )}

            <div className="border-t border-border/80 pt-6 mt-6">
              <MatchShareSection matchData={matchData} registrations={registrations} />
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}

export default function MatchDetails({ matchId, editParam }: { matchId: string; editParam?: string | null }) {
  return (
    <MatchDetailsProvider matchId={matchId}>
      <MatchDetailsInner editParam={editParam} />
    </MatchDetailsProvider>
  );
}