"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export default function RootPage() {
  const projects = useQuery(api.projects.list);
  const router = useRouter();

  useEffect(() => {
    if (projects === undefined) return;
    if (projects.length === 1) {
      router.replace(`/projects/${projects[0]._id}`);
    } else {
      router.replace("/projects");
    }
  }, [projects, router]);

  return null;
}
