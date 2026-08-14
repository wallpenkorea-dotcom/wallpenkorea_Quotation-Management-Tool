import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  downloadUrl?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  downloadUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="image-viewer-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        id="image-viewer-dialog"
        className="relative max-h-[92vh] max-w-[92vw] overflow-hidden rounded-xl bg-slate-900 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-white">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="text-sm font-medium text-slate-200 truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                title="다운로드"
              >
                <Download className="w-3.5 h-3.5" />
                다운로드
              </a>
            )}
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="새 탭에서 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              원본보기
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image content */}
        <div className="flex flex-1 items-center justify-center overflow-auto p-4 bg-slate-950/70 min-h-[300px]">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-md select-none"
          />
        </div>
      </div>
    </div>
  );
};
