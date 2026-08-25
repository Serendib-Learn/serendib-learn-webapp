"use client";

import { useAuth } from "@/lib/auth";
import { AdminDashboard } from "@/components/portal/dashboard-admin";
import { StudentDashboard } from "@/components/portal/dashboard-student";
import { TutorDashboard } from "@/components/portal/dashboard-tutor";
import { Loading } from "@/components/ui/primitives";

export default function PortalHomePage() {
  const { user } = useAuth();

  if (!user) return <Loading />;
  if (user.role === "admin") return <AdminDashboard user={user} />;
  if (user.role === "tutor") return <TutorDashboard user={user} />;
  return <StudentDashboard user={user} />;
}
