"use client";

import React, { useState, useEffect } from "react";
import {
  Cloud,
  CloudOff,
  Trash2,
  RefreshCw,
  Database,
  Lock,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface SnapshotRecord {
  id: string;
  name: string;
  timestamp: string;
  pupils: any[];
  assignments: any[];
  submissions: any;
}

export function CloudSyncModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    teacherId,
    syncStatus,
    createSnapshot,
    getSnapshots,
    restoreSnapshot,
    deleteSnapshot,
  } = useTracker();
  const { user } = useAuth();
  const confirm = useConfirm();

  const [snapshotName, setSnapshotName] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  const refreshSnapshots = async () => {
    if (!teacherId) return;
    setLoadingSnapshots(true);
    try {
      const records = await getSnapshots();
      setSnapshots(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    if (isOpen && teacherId) {
      refreshSnapshots();
    }
  }, [isOpen, teacherId]);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim()) return;
    try {
      await createSnapshot(snapshotName.trim());
      setSnapshotName("");
      await refreshSnapshots();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async (snap: SnapshotRecord) => {
    if (
      await confirm({
        title: "Restore snapshot?",
        message: `Restore “${snap.name}”? This overwrites your active class's homework, attendance, and behavior state.`,
        confirmLabel: "Restore",
        tone: "brand",
      })
    ) {
      await restoreSnapshot(snap);
      onClose();
    }
  };

  const handleDeleteSnap = async (id: string) => {
    if (
      await confirm({
        title: "Delete snapshot?",
        message: "Delete this snapshot? This can't be undone.",
        confirmLabel: "Delete",
      })
    ) {
      await deleteSnapshot(id);
      await refreshSnapshots();
    }
  };

  const statusLabels = {
    synced: { text: "Synced", color: "text-success-ink bg-success-bg border-success/20" },
    saving: { text: "Saving...", color: "text-warning-ink bg-warning-bg border-warning/20" },
    offline: { text: "Offline", color: "text-paper-500 bg-paper-100 border-paper-200" },
    error: { text: "Error syncing", color: "text-danger-ink bg-danger-bg border-danger/20" },
  };

  const currentStatus = statusLabels[syncStatus];
  const accountName = user?.displayName || user?.email || "your account";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cloud Database Settings"
      titleIcon={<Database className="h-5 w-5 text-brand-600" />}
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-paper-100 shadow-soft">
          <div>
            <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
              Sync Status
            </p>
            <div className="flex items-center gap-2 mt-1">
              {syncStatus === "saving" ? (
                <RefreshCw className="h-4 w-4 animate-spin text-warning" />
              ) : syncStatus === "error" ? (
                <CloudOff className="h-4 w-4 text-danger" />
              ) : (
                <Cloud className="h-4 w-4 text-success" />
              )}
              <span
                className={`px-2 py-0.5 text-2xs font-bold rounded-full border ${currentStatus.color}`}
              >
                {currentStatus.text}
              </span>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="rounded-lg bg-brand-50 border border-brand-100 p-4 text-sm text-brand-800 leading-relaxed">
          <p className="font-semibold mb-1">Synced to your account</p>
          Your classes, rosters, homework, attendance, and behavior logs sync
          automatically to <span className="font-semibold">{accountName}</span>.
          Sign in with the same account on any device or browser to see the
          same data.
          <p className="mt-2 text-2xs text-brand-700 flex items-start gap-1">
            <Lock className="inline h-3 w-3 mt-0.5 shrink-0" />
            Your data is private to your signed-in account.
          </p>
        </div>

        {/* Snapshots Management */}
        <div className="border-t border-paper-200 pt-6 space-y-4">
          <h3 className="font-display text-base font-bold text-paper-800">
            Data Backup Snapshots
          </h3>

          <form onSubmit={handleCreateSnapshot} className="space-y-2">
            <Field label="Create New Backup Point">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. End of Term 1"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  className={`flex-1 ${fieldClassName}`}
                  maxLength={40}
                  required
                />
                <Button type="submit" variant="secondary">
                  Save Snapshot
                </Button>
              </div>
            </Field>
          </form>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-2xs font-bold uppercase tracking-wider text-paper-400">
                Saved Snapshots
              </label>
              <button
                onClick={refreshSnapshots}
                className="text-2xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${loadingSnapshots ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {loadingSnapshots ? (
              <p className="text-center py-6 text-xs text-paper-400">
                Loading backups…
              </p>
            ) : snapshots.length === 0 ? (
              <div className="text-center py-8 rounded-lg border border-dashed border-paper-200 bg-surface">
                <p className="text-xs text-paper-400">
                  No snapshot points recorded yet.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-paper-100 max-h-48 overflow-y-auto thin-scroll border border-paper-200 rounded-md bg-surface">
                {snapshots.map((snap) => (
                  <li
                    key={snap.id}
                    className="flex items-center justify-between p-3 text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-paper-700 truncate">
                        {snap.name}
                      </p>
                      <p className="text-2xs text-paper-400 mt-0.5">
                        {new Date(snap.timestamp).toLocaleString()} ·{" "}
                        {snap.pupils?.length || 0} Pupils ·{" "}
                        {snap.assignments?.length || 0} Assignments
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestore(snap)}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSnap(snap.id)}
                        aria-label="Delete snapshot"
                        title="Delete snapshot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
