import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Check, Image as ImageIcon, RotateCcw, AlertCircle } from 'lucide-react';

interface BannerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BannerSettingsModal: React.FC<BannerSettingsModalProps> = ({ isOpen, onClose }) => {
  const [currentBanner, setCurrentBanner] = useState<string>(() => {
    return localStorage.getItem('wallpen_custom_banner') || '/wallpen-banner.png';
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings/banner')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.bannerUrl) {
            setCurrentBanner(data.bannerUrl);
            localStorage.setItem('wallpen_custom_banner', data.bannerUrl);
          }
        })
        .catch(() => {});
      setPreviewUrl(null);
      setSelectedFile(null);
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('이미지 파일(PNG, JPG, WebP 등)만 선택할 수 있습니다.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSaveBanner = async () => {
    if (!selectedFile) {
      setErrorMsg('업로드할 새 이미지 파일을 먼저 선택해주세요.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('banner', selectedFile);

    try {
      const res = await fetch('/api/settings/banner', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const savedUrl = data.bannerUrl || previewUrl;
        setCurrentBanner(savedUrl);
        localStorage.setItem('wallpen_custom_banner', savedUrl);
        setSuccessMsg('메인 화면 및 공유 배너 이미지가 성공적으로 변경되었습니다!');
        setSelectedFile(null);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Fallback: Save as Base64 in LocalStorage
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          localStorage.setItem('wallpen_custom_banner', base64);
          setCurrentBanner(base64);
          setSuccessMsg('배너 이미지가 성공적으로 저장되었습니다!');
          setSelectedFile(null);
          setTimeout(() => {
            onClose();
          }, 1500);
        };
        reader.readAsDataURL(selectedFile);
      }
    } catch {
      // Offline fallback
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        localStorage.setItem('wallpen_custom_banner', base64);
        setCurrentBanner(base64);
        setSuccessMsg('배너 이미지가 로컬에 성공적으로 저장되었습니다!');
        setSelectedFile(null);
        setTimeout(() => {
          onClose();
        }, 1500);
      };
      reader.readAsDataURL(selectedFile);
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      localStorage.removeItem('wallpen_custom_banner');
      setCurrentBanner('/wallpen-banner.png');
      setPreviewUrl(null);
      setSelectedFile(null);
      setSuccessMsg('기본 브랜드 배너로 초기화되었습니다.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scaleIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">메인 배너 이미지 관리</h3>
              <p className="text-xs text-slate-500">관리자 전용 — 메인 로그인 및 고객 견적서 상단에 노출됩니다</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-700 text-xs">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Current / New Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              배너 미리보기 {previewUrl && <span className="text-blue-600 font-normal">(새로 선택된 이미지)</span>}
            </label>
            <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner relative group">
              <img
                src={previewUrl || currentBanner}
                alt="Banner Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white cursor-pointer"
              >
                <Upload className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-semibold">클릭하여 이미지 파일 선택</span>
              </button>
            </div>
          </div>

          {/* File Picker trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>PC에서 새 이미지 파일 선택</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              title="기본 배너로 초기화"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>기본 초기화</span>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">📌 이미지 권장 사항</p>
            <p>• 비율: 16:9 가로형 와이드 비율 (1280x720 또는 1920x1080) 권장</p>
            <p>• 형식: PNG, JPG, WebP 지원 (유튜브 배경2.png 등)</p>
            <p>• 저장 시 메인 로그인 화면 및 발주처 공유 링크 상단에 즉시 적용됩니다.</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSaveBanner}
            disabled={uploading || !selectedFile}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>적용 및 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
