"use client";

import HomeCurrent from "@/components/home/HomeCurrent";
import HomePreview from "@/components/home/HomePreview";
import { useAdminLayoutPreview } from "@/src/lib/use-admin-layout-preview";

export default function Home() {
  const { loading, previewEnabled } = useAdminLayoutPreview();

  if (loading) {
    return <HomeCurrent />;
  }

  return previewEnabled ? <HomePreview /> : <HomeCurrent />;
}
