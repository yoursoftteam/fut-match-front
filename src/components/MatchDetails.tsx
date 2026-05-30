"use client";

import { useState } from "react";
import { MatchDetailsProvider, useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { MatchInfoSidebar, MatchEditForm, MatchTabs, RegistrationPanel, PlayersPanel, TeamBuilder } from "@/components/match-details";
import { MatchShareSection } from "@/components/match-details/MatchShareSection";
import { useMatchPricing } from "@/hooks/useMatchPricing";
import { useMatchEditing } from "@/hooks/useMatchEditing";

type PanelTab = "register" | "players" | "teams";

function MatchDetailsInner() {
  const { loading, error, matchData, isCreator } = useMatchDetailsContext();
  useMatchPricing();
  const editing = useMatchEditing();

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
              <MatchShareSection matchData={matchData} />
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
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
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
          </div>
        </section>
      </div>
    </div>
  );
}

export default function MatchDetails({ matchId }: { matchId: string }) {
  return (
    <MatchDetailsProvider matchId={matchId}>
      <MatchDetailsInner />
    </MatchDetailsProvider>
  );
}