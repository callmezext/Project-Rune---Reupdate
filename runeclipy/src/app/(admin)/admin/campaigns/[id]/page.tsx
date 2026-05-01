"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

// Redirect to the full-featured edit page
export default function CampaignDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/admin/campaigns/${id}/edit`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-4xl animate-pulse">🎵</div>
    </div>
  );
}
