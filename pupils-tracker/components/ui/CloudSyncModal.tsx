"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Cloud,
  CloudOff,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Database,
  Lock,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";

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
    enableSync,
    disableSync,
    createSnapshot,
    getSnapshots,
    restoreSnapshot,
    deleteSnapshot,
  } = useTracker();

  const [inputKey, setInputKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

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

  if (!isOpen) return null;

  const handleCopy = () => {
    if (teacherId) {
      navigator.clipboard.writeText(teacherId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLinkKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    setIsLinking(true);
    setLinkError("");
    const success = await enableSync(inputKey);
    setIsLinking(false);
    if (success) {
      setInputKey("");
    } else {
      setLinkError("Failed to load this sync key. Double check the format.");
    }
  };

  const handleGenerateKey = async () => {
    setIsLinking(true);
    setLinkError("");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const generated = `TCHR-${part1}-${part2}`;
    const success = await enableSync(generated);
    setIsLinking(false);
    if (!success) {
      setLinkError("Failed to generate a sync key. Try again.");
    }
  };

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
      confirm(
        `Are you sure you want to restore the snapshot "${snap.name}"? This will overwrite your active class's homework, attendance, and behavior state.`
      )
    ) {
      await restoreSnapshot(snap);
      onClose();
    }
  };

  const handleDeleteSnap = async (id: string) => {
    if (confirm("Are you sure you want to delete this snapshot?")) {
      await deleteSnapshot(id);
      await refreshSnapshots();
    }
  };

  const statusLabels = {
    synced: { text: "Synced", color: "text-success bg-success-bg border-success/20" },
    saving: { text: "Saving...", color: "text-warning bg-warning-bg border-warning/20" },
    offline: { text: "Offline", color: "text-paper-500 bg-paper-100 border-paper-200" },
    error: { text: "Error syncing", color: "text-danger bg-danger-bg border-danger/20" },
  };

  const currentStatus = statusLabels[syncStatus];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper-900/40 backdrop-blur-sm">
      <div className="card w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-paper-200 px-6 py-4 bg-surface">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-lg font-bold text-paper-800">
              Cloud Database Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-paper-400 hover:text-paper-600 outline-none rounded-md p-1 focus-visible:shadow-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 thin-scroll bg-paper-50/30">
          {!teacherId ? (
            /* Sync Setup View */
            <div className="space-y-4">
              <div className="rounded-lg bg-brand-50 border border-brand-100 p-4 text-sm text-brand-800 leading-relaxed">
                <p className="font-semibold mb-1">Backup & Sync Classroom Data</p>
                Link your project to the Firebase database to automatically sync classes, rosters, homework submissions, attendance tracker, and behavior logs. Access your data from any device by entering your Class Code.
              </div>

              <form onSubmit={handleLinkKey} className="space-y-4">
                <Field label="Enter Existing Teacher Sync Key">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. TCHR-XXXX-XXXX"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className={`flex-1 ${fieldClassName}`}
                    />
                    <Button type="submit" disabled={isLinking}>
                      Link Key
                    </Button>
                  </div>
                  {linkError && (
                    <p className="mt-1.5 text-xs font-semibold text-danger">
                      {linkError}
                    </p>
                  )}
                </Field>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-paper-200" />
                </div>
                <div className="relative flex justify-center text-xs font-bold uppercase">
                  <span className="bg-surface px-3 text-paper-400">Or</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleGenerateKey}
                disabled={isLinking}
              >
                Generate New Class Code
              </Button>
            </div>
          ) : (
            /* Sync Active View */
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-paper-100 shadow-sm">
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

                <Button variant="ghost" size="sm" onClick={disableSync}>
                  Unlink Key
                </Button>
              </div>

              {/* Key Display */}
              <div>
                <label className="mb-1 block text-2xs font-bold uppercase tracking-wider text-paper-400">
                  Your Teacher Sync Key
                </label>
                <div className="flex items-center gap-2 rounded-md border border-paper-200 bg-paper-50 p-3">
                  <code className="flex-1 font-mono text-base font-bold tracking-wider text-paper-800">
                    {teacherId}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="text-brand-600 hover:text-brand-700 outline-none p-1 rounded-md transition hover:bg-brand-50"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-success animate-in fade-in" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-3xs text-paper-400 leading-normal">
                  <Lock className="inline h-3 w-3 mr-1 align-text-bottom" />
                  Keep this key private. Use it on another device to restore and live-sync all your pupil data.
                </p>
              </div>

              {/* Snapshots Management */}
              <div className="border-t border-paper-200 pt-6 space-y-4">
                <h3 className="font-display text-md font-bold text-paper-800">
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
                      className="text-3xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
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
                            <p className="text-4xs text-paper-400 mt-0.5">
                              {new Date(snap.timestamp).toLocaleString()} ·{" "}
                              {snap.pupils?.length || 0} Pupils ·{" "}
                              {snap.assignments?.length || 0} Assignments
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleRestore(snap)}
                              className="px-2 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700 font-semibold hover:bg-brand-100"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteSnap(snap.id)}
                              className="p-1 rounded text-paper-400 hover:text-danger hover:bg-danger-bg"
                              title="Delete snapshot"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-paper-200 px-6 py-4 bg-surface flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
