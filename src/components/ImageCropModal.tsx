import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function ImageCropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const SIZE = 280;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const x = (SIZE - iw) / 2 + offset.x;
    const y = (SIZE - ih) / 2 + offset.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, iw, ih);
    ctx.restore();

    // Dim area outside circle
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [scale, offset]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const fit = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    });
  };
  const onMouseUp = () => setDragging(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: offset.x, oy: offset.y };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({
      x: dragStart.current.ox + (t.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (t.clientY - dragStart.current.my),
    });
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = SIZE;
    out.height = SIZE;
    const ctx = out.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const x = (SIZE - iw) / 2 + offset.x;
    const y = (SIZE - ih) / 2 + offset.y;
    ctx.drawImage(img, x, y, iw, ih);
    out.toBlob((blob) => { if (blob) onConfirm(blob); }, 'image/png');
  };

  const resetZoom = () => {
    const img = imgRef.current;
    if (!img) return;
    const fit = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
    setScale(fit);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <div className="text-sm font-semibold text-white">Recortar foto</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Arraste para posicionar · use o slider para zoom</div>
          </div>
          <button onClick={onCancel} className="text-neutral-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 px-5 py-6">
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className={`rounded-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => setDragging(false)}
            />
          </div>

          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <ZoomOut size={14} />
            </button>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-white h-1 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              title="Resetar zoom"
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onCancel}
            className="text-neutral-500 hover:text-white text-xs transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="bg-white text-black rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-200 transition-all"
          >
            <Check size={12} /> Aplicar recorte
          </button>
        </div>
      </div>
    </div>
  );
}
