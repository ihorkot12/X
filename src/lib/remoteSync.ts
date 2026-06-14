import { SavedAthleteProfile, SavedProgramRecord, TeamMembership, TeamRecord, TestHistoryEntry, TrainingLogEntry, UserAccount } from "../types";

export type SyncSnapshot = {
  account: UserAccount;
  athletes: SavedAthleteProfile[];
  programs: SavedProgramRecord[];
  logs: TrainingLogEntry[];
  teams?: TeamRecord[];
  memberships?: TeamMembership[];
  testHistory?: TestHistoryEntry[];
};

export type SyncStatus = "local" | "syncing" | "synced" | "offline" | "error";

export const remoteSyncEnabled = import.meta.env.VITE_BBP_REMOTE_SYNC === "true";

function syncHeaders(account: UserAccount) {
  return {
    "Content-Type": "application/json",
    "X-BBP-Account-Id": account.id,
    "X-BBP-Sync-Token": account.syncToken || "",
  };
}

export async function fetchRemoteSnapshot(account: UserAccount): Promise<SyncSnapshot | null> {
  if (!remoteSyncEnabled) return null;
  const response = await fetch(`/api/sync?email=${encodeURIComponent(account.email)}`, {
    headers: syncHeaders(account),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Remote sync pull failed: ${response.status}`);
  return response.json() as Promise<SyncSnapshot>;
}

export async function pushRemoteSnapshot(snapshot: SyncSnapshot): Promise<void> {
  if (!remoteSyncEnabled) return;
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: syncHeaders(snapshot.account),
    body: JSON.stringify(snapshot),
  });
  if (!response.ok) throw new Error(`Remote sync push failed: ${response.status}`);
}
