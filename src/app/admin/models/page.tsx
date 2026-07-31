// =============================================================================
// Admin AI Models Page — Server component that fetches registry and renders client
// =============================================================================

import { db } from "@/lib/db";
import adminStyles from "../admin.module.css";
import ModelsClient from "./ModelsClient";

export const metadata = { title: "AI Model Registry — Hamdard AI Platform" };

export default async function AdminModelsPage() {
  const models = await db.aiModel.findMany({
    orderBy: [{ provider: "asc" }, { displayName: "asc" }],
  });

  return (
    <div>
      <div className={adminStyles.adminPageHeader}>
        <h1 className={adminStyles.adminPageTitle}>AI Model Registry</h1>
        <p className={adminStyles.adminPageSubtitle}>
          Manage AI model integrations, enable/disable providers, and configure default models.
        </p>
      </div>
      <ModelsClient initialModels={models} />
    </div>
  );
}
