"use client";

import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  Circle,
  Hand,
  Highlighter,
  Maximize,
  Pen,
  RotateCcw,
  RotateCw,
  Star,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { MARK_COLORS, type MarkColor } from "@/lib/photo-annotate";
import { colorVar, type PenSize, type PhotoTool } from "./PhotoCanvas";

const TOOLS: { tool: PhotoTool; label: string; icon: ReactNode }[] = [
  { tool: "move", label: "Move and zoom", icon: <Hand className="h-5 w-5" /> },
  { tool: "pen", label: "Pen", icon: <Pen className="h-5 w-5" /> },
  { tool: "highlight", label: "Highlighter", icon: <Highlighter className="h-5 w-5" /> },
  { tool: "circle", label: "Circle", icon: <Circle className="h-5 w-5" /> },
  { tool: "arrow", label: "Arrow", icon: <ArrowUpRight className="h-5 w-5" /> },
  { tool: "tick", label: "Tick stamp", icon: <Check className="h-5 w-5 text-success" /> },
  { tool: "cross", label: "Cross stamp", icon: <X className="h-5 w-5 text-danger" /> },
  { tool: "star", label: "Star stamp", icon: <Star className="h-5 w-5 fill-warning text-warning-ink" /> },
];

const COLOR_NAMES: Record<MarkColor, string> = {
  danger: "Red",
  info: "Blue",
  success: "Green",
  warning: "Yellow",
};

const SIZE_LABELS = ["Thin", "Medium", "Thick"];

function ToolButton({
  label,
  pressed,
  onClick,
  disabled,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md outline-none transition focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed
          ? "bg-brand-500 text-surface"
          : "text-paper-700 hover:bg-paper-100"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden="true" className="mx-1 h-7 w-px shrink-0 bg-paper-200" />;

export interface PhotoToolbarProps {
  tool: PhotoTool;
  onTool: (t: PhotoTool) => void;
  color: MarkColor;
  onColor: (c: MarkColor) => void;
  size: PenSize;
  onSize: (s: PenSize) => void;
  onRotate: (deg: 90 | -90) => void;
  onZoom: (factor: number) => void;
  onFit: () => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  className?: string;
}

/** Zoom / rotate / markup controls, shared by the board and the phone. */
export function PhotoToolbar({
  tool,
  onTool,
  color,
  onColor,
  size,
  onSize,
  onRotate,
  onZoom,
  onFit,
  onUndo,
  onClear,
  canUndo,
  className = "",
}: PhotoToolbarProps) {
  const usesColor = tool === "pen" || tool === "highlight" || tool === "circle" || tool === "arrow";
  return (
    <div
      role="toolbar"
      aria-label="Photo tools"
      onPointerDown={(e) => e.stopPropagation()}
      className={`flex items-center gap-0.5 overflow-x-auto rounded-card bg-surface p-1.5 shadow-float ${className}`}
    >
      {TOOLS.map((t) => (
        <ToolButton key={t.tool} label={t.label} pressed={tool === t.tool} onClick={() => onTool(t.tool)}>
          {t.icon}
        </ToolButton>
      ))}
      <Divider />
      {MARK_COLORS.map((c) => (
        <ToolButton
          key={c}
          label={`${COLOR_NAMES[c]} ink`}
          pressed={usesColor && color === c}
          disabled={!usesColor}
          onClick={() => onColor(c)}
        >
          <span
            className="block h-6 w-6 rounded-full border-2 border-surface shadow-soft"
            data-theme="light"
            style={{ background: colorVar(c) }}
          />
        </ToolButton>
      ))}
      {([0, 1, 2] as PenSize[]).map((s) => (
        <ToolButton
          key={s}
          label={`${SIZE_LABELS[s]} size`}
          pressed={tool !== "move" && size === s}
          disabled={tool === "move"}
          onClick={() => onSize(s)}
        >
          <span
            className="block rounded-full bg-current"
            style={{ width: 6 + s * 5, height: 6 + s * 5 }}
          />
        </ToolButton>
      ))}
      <Divider />
      <ToolButton label="Turn left" onClick={() => onRotate(-90)}>
        <RotateCcw className="h-5 w-5" />
      </ToolButton>
      <ToolButton label="Turn right" onClick={() => onRotate(90)}>
        <RotateCw className="h-5 w-5" />
      </ToolButton>
      <ToolButton label="Zoom out" onClick={() => onZoom(1 / 1.4)}>
        <ZoomOut className="h-5 w-5" />
      </ToolButton>
      <ToolButton label="Zoom in" onClick={() => onZoom(1.4)}>
        <ZoomIn className="h-5 w-5" />
      </ToolButton>
      <ToolButton label="Fit to screen" onClick={onFit}>
        <Maximize className="h-5 w-5" />
      </ToolButton>
      <Divider />
      <ToolButton label="Undo" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="h-5 w-5" />
      </ToolButton>
      <ToolButton label="Clear all marks" onClick={onClear} disabled={!canUndo}>
        <Trash2 className="h-5 w-5 text-danger" />
      </ToolButton>
    </div>
  );
}
