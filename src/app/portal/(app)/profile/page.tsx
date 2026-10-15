"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/portal/page-header";
import { ProfileEditor } from "@/components/portal/profile-editor";
import { Alert, Card, Loading } from "@/components/ui/primitives";

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return <Loading />;

  const isTutor = user.role === "tutor";

  return (
    <>
      <PageHeader title="Your profile">
        {isTutor
          ? "This is what students see on the tutors page and when they book you."
          : "How you appear to your tutors and to other members of the community."}
      </PageHeader>

      {isTutor && user.tutorStatus === "pending" ? (
        <Alert tone="saffron" className="mb-6">
          Your profile goes public once our team approves your application. Fill it in now so
          it is ready.
        </Alert>
      ) : null}
      {isTutor && (user.tutorStatus ?? "approved") === "approved" ? (
        <p className="mb-6 text-sm text-ink-500">
          Live on the{" "}
          <Link href="/tutors" className="font-medium text-jade-700 hover:text-jade-600">
            tutors page
          </Link>{" "}
          — changes appear there within a minute.
        </p>
      ) : null}

      <Card className="p-6 sm:p-8">
        {/* Keyed on the id so a different account never inherits stale form state. */}
        <ProfileEditor key={user.id} user={user} />
      </Card>
    </>
  );
}
