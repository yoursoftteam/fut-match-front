import { JoinInviteGate } from "@/components/bet/JoinInviteGate";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ invite_code: string }>;
}) {
  const { invite_code } = await params;
  const normalizedCode = invite_code.toUpperCase();

  return (
    <div className="min-h-dvh bg-[#0F172A]">
      <JoinInviteGate inviteCode={normalizedCode} />
    </div>
  );
}
