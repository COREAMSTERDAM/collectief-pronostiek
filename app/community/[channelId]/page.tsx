"use client";

import { useParams } from "next/navigation";
import CommunityChannelView from "@/components/community/CommunityChannelView";

export default function CommunityChannelPage() {
  const params = useParams<{ channelId: string }>();
  const channelId = Number(params.channelId);

  if (!Number.isInteger(channelId) || channelId <= 0) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card text-center">
            <h1 className="text-xl font-black text-white">
              Ongeldig kanaal
            </h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <CommunityChannelView channelId={channelId} />
    </main>
  );
}
