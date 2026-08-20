import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Check, FileSpreadsheet, Download, AlertCircle, Sparkles } from 'lucide-react';

interface TemplateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateSettingsModal: React.FC<TemplateSettingsModalProps> = ({ isOpen, onClose }) => {
  const [templateInfo, setTemplateInfo] = useState<{
    hasCustomTemplate: boolean;
    templateName: string;
    updatedAt?: string;
  }>({
    hasCustomTemplate: false,
    templateName: '기본 샘플 엑셀',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplateInfo = () => {
    fetch('/api/settings/template-info')
      .then((res) => res.json())
      .then((data) => {
        if (data) setTemplateInfo(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplateInfo();
      setSelectedFile(null);
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'];
    if (!validExtensions.includes(ext)) {
      setErrorMsg('엑셀 파일(.xlsx, .xls, .xlsm, .csv)만 선택할 수 있습니다.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
  };

  const handleSaveTemplate = async () => {
    if (!selectedFile) {
      setErrorMsg('업로드할 엑셀 파일을 먼저 선택해주세요.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('template', selectedFile);

    try {
      const res = await fetch('/api/settings/template', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '양식 등록 실패');
      }

      setSuccessMsg('대표님의 엑셀 파일이 표준 견적 양식으로 성공적으로 등록되었습니다!');
      setSelectedFile(null);
      loadTemplateInfo();
    } catch (err: any) {
      setErrorMsg(err.message || '업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      id="template-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                표준 견적서 엑셀 양식 관리
              </h2>
              <p className="text-xs text-slate-500">
                상단 [견적 양식] 버튼 클릭 시 열리는 엑셀 파일을 내 파일로 교체합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Current Status */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-0.5">현재 등록된 엑셀 파일</div>
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[260px]">{templateInfo.templateName}</span>
              </div>
              {templateInfo.updatedAt && (
                <div className="text-[11px] text-slate-400 mt-1">
                  등록일시: {new Date(templateInfo.updatedAt).toLocaleString('ko-KR')}
                </div>
              )}
            </div>

            <a
              href="/api/projects/sample-template"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              다운로드
            </a>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              새 엑셀 파일(.xlsx) 업로드 등록
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                selectedFile
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
                  <Upload className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div>
                    <div className="font-bold text-slate-800">{selectedFile.name}</div>
                    <div className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB (클릭하여 파일 변경)
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium text-slate-700">
                      클릭하여 내 엑셀 견적서 파일 선택
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      .xlsx, .xls 파일 지원
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notification Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Information Notice */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-blue-950">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              스마트 엑셀 템플릿 연동
            </div>
            대표님의 고유 견적서 양식을 등록하시면, 상단의 <strong>[견적 양식]</strong> 버튼을 누를 때마다 등록하신 엑셀 파일이 즉시 다운로드되며, 현장 등록 시에도 이 서식에 맞춰 AI가 자동 학습 및 필드 매핑을 최적화합니다.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={!selectedFile || uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {uploading ? (
              <span>등록 중...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>내 엑셀 양식으로 저장</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
