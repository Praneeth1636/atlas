"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAtlasStore } from "@/app/lib/store";

export default function LearnRedirectPage() {
  const router = useRouter();
  const learningPath = useAtlasStore((state) => state.learningPath);

  useEffect(() => {
    if (learningPath?.lessons[0]?.id) {
      router.replace(`/learn/${learningPath.lessons[0].id}`);
      return;
    }

    router.replace("/");
  }, [learningPath, router]);

  return null;
}
