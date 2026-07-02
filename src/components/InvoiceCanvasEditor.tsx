import { useRef, useState, useCallback } from "react";
import type { CustomLayout, LayoutBlockKey } from "@/lib/types";

const MM_W = 210;
const MM_H = 297;
const PX_W = 460;
const SCALE = PX_W / MM_W;
const PX_H = MM_H * SCALE;

// Approximate default box (mm) for each block — matches customInvoicePdf.ts layout closely
// enough to act as a drag handle; the real PDF is the source of truth for final rendering.
const BLOCK_DEFAULTS: Record<LayoutBlockKey, { x: number; y: number; w: number; h: number; label: string }> = {
  header: { x: 14, y: 4, w: 120, h: 26, label: "Company Header" },
  sellerContact: { x: 138, y: 4, w: 58, h: 22, label: "Seller Contact" },
  invoiceMeta: { x: 14, y: 48, w: 182, h: 12, label: "Invoice # / Date" },
  billTo: { x: 14, y: 62, w: 90, h: 22, label: "Bill To" },
  customerContact: { x: 118, y: 62, w: 78, h: 22, label: "Customer Contact" },
  itemsTable: { x: 14, y: 94, w: 182, h: 55, label: "Items" },
  totals: { x: 120, y: 155, w: 76, h: 26, label: "Totals" },
  terms: { x: 14, y: 188, w: 182, h: 28, label: "Terms" },
  signature: { x: 140, y: 248, w: 56, h: 24, label: "Signature" },
};

interface Props {
  positions: CustomLayout["positions"];
  onChange: (positions: CustomLayout["positions"]) => void;
  primary: string;
  accent: string;
}

export function InvoiceCanvasEditor({ positions, onChange, primary, accent }: Props) {
  const [dragging, setDragging] = useState<LayoutBlockKey | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const startDrag = useCallback((key: LayoutBlockKey, e: React.MouseEvent) => {
    e.preventDefault();
    const cur = positions?.[key] || { x: 0, y: 0 };
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: cur.x, origY: cur.y };
    setDragging(key);

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dxMm = (ev.clientX - dragState.current.startX) / SCALE;
      const dyMm = (ev.clientY - dragState.current.startY) / SCALE;
      onChange({
        ...positions,
        [key]: {
          x: Math.round((dragState.current.origX + dxMm) * 10) / 10,
          y: Math.round((dragState.current.origY + dyMm) * 10) / 10,
        },
      });
    };
    const onUp = () => {
      setDragging(null);
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [positions, onChange]);

  const resetBlock = (key: LayoutBlockKey) => {
    const next = { ...positions };
    delete (next as Record<string, unknown>)[key];
    onChange(next);
  };

  const resetAll = () => onChange({});

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">Drag to reposition</span>
        <button type="button" onClick={resetAll} className="text-[10px] text-muted-foreground underline">
          Reset all positions
        </button>
      </div>
      <div
        className="relative border rounded-md bg-white overflow-hidden select-none mx-auto shadow-sm"
        style={{ width: PX_W, height: PX_H }}
      >
        {(Object.keys(BLOCK_DEFAULTS) as LayoutBlockKey[]).map((key) => {
          const def = BLOCK_DEFAULTS[key];
          const off = positions?.[key] || { x: 0, y: 0 };
          const left = (def.x + off.x) * SCALE;
          const top = (def.y + off.y) * SCALE;
          const active = dragging === key;
          return (
            <div
              key={key}
              onMouseDown={(e) => startDrag(key, e)}
              onDoubleClick={() => resetBlock(key)}
              title="Drag to move · double-click to reset"
              className="absolute flex items-center justify-center text-center text-[9px] font-medium rounded-sm cursor-move border px-1 leading-tight"
              style={{
                left, top, width: def.w * SCALE, height: def.h * SCALE,
                background: active ? accent + "33" : primary + "14",
                borderColor: active ? accent : primary + "66",
                color: primary,
                zIndex: active ? 20 : 1,
              }}
            >
              {def.label}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        Click and drag any block. Double-click a block to reset just that one. This is a positioning guide —
        check the Live Preview below for the exact final look.
      </p>
    </div>
  );
}
