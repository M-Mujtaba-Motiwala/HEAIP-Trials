// =============================================================================
// Chat Layout — Server component with sidebar + main content area
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ChatSidebar from "./ChatSidebar";
import styles from "./chat.module.css";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch user's chat sessions for the sidebar
  const chatSessions = await db.chatSession.findMany({
    where: {
      employeeId: session.user.id,
      isArchived: false,
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  const serializedSessions = chatSessions.map((s) => ({
    id: s.id,
    title: s.title,
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div className={styles.chatLayout}>
      <ChatSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          department: session.user.department,
        }}
        chatSessions={serializedSessions}
      />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
