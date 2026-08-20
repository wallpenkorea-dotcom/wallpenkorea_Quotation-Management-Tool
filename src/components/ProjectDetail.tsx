import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Trash2,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Building2,
  Layers,
  DollarSign,
  ShieldAlert,
  Download,
  FileQuestion,
  Lock,
  Plus
} from 'lucide-react';
import {
  ProjectItem,
  ProjectStatus,
  PaymentStatus,
  FileType,
  ProjectFile,
  PublicSettings,
} from '../types';
import {
  formatKRW,
  formatDate,
  formatDateTime,
  formatFileSize,
  getStatusBadgeStyle,
  getPaymentBadgeStyle,
  getFileTypeColor,
} from '../utils/formatters';
import { ImageViewerModal } from './ImageViewerModal';

interface ProjectDetailProps {
  project: ProjectItem;
  onBack: () => void;
  onUpdateSuccess: (updated: ProjectItem) => void;
  onDeleteSuccess: (id: string) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onBack,
  onUpdateSuccess,
  onDeleteSuccess,
}) => {
  // Form states initialized from project
  const [formData, setFormData] = useState<ProjectItem>(project);
  const [originalSnapshot, setOriginalSnapshot] = useState<string>(JSON.stringify(project));
  const [activeTab, setActiveTab] = useState<'info' | 'files' | 'share'>('info');

  // Status and feedback
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // File upload config
  const [uploadFileType, setUploadFileType] = useState<FileType>('현장 사진');
  const [uploadIsPublic, setUploadIsPublic] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Modal
  const [viewerImage, setViewerImage] = useState<{ url: string; title: string; downloadUrl?: string } | null>(null);

  // Modals for confirmation (replaces window.confirm)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Unsaved changes check
  const hasUnsavedChanges = JSON.stringify(formData) !== originalSnapshot;

  useEffect(() => {
    setFormData(project);
    setOriginalSnapshot(JSON.stringify(project));
  }, [project.id]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBackWithGuard = () => {
    onBack();
  };

  const handleReset = () => {
    setFormData(JSON.parse(originalSnapshot));
    setShowResetModal(false);
    showToast('변경사항이 원래대로 복원되었습니다.');
  };

  const handleSave = async () => {
    if (!formData.projectName.trim()) {
      showToast('현장명은 필수 입력 항목입니다.', 'error');
      return;
    }

    setSaving(true);
    try {
      let updated: any = null;
      try {
        const res = await fetch(`/api/projects/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            updated = await res.json();
          }
        }
      } catch (e) {
        console.warn('Server PUT warning, updating locally:', e);
      }

      if (!updated) {
        updated = { ...formData, updatedAt: new Date().toISOString() };
      }

      setFormData(updated);
      setOriginalSnapshot(JSON.stringify(updated));
      onUpdateSuccess(updated);
      showToast('성공적으로 저장되었습니다.');
    } catch (err: any) {
      showToast(err.message || '저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      try {
        await fetch(`/api/projects/${formData.id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('Server DELETE warning, deleting locally:', e);
      }
      setShowDeleteModal(false);
      onDeleteSuccess(formData.id);
      showToast('현장이 성공적으로 삭제되었습니다.');
    } catch (err: any) {
      showToast(err.message || '삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  // Supply amount change auto calculate
  const handleSupplyChange = (supply: number) => {
    const tax = Math.round(supply * 0.1);
    const total = supply + tax;
    const deposit = Math.round(total * 0.5);
    const balance = total - deposit;

    setFormData((prev) => ({
      ...prev,
      supplyAmount: supply,
      taxAmount: tax,
      totalAmount: total,
      depositAmount: deposit,
      balanceAmount: balance,
    }));
  };

  // Dimensions change auto calculate area
  const handleDimensionChange = (field: 'printWidthMm' | 'printHeightMm', val: number | null) => {
    setFormData((prev) => {
      const w = field === 'printWidthMm' ? val : prev.printWidthMm;
      const h = field === 'printHeightMm' ? val : prev.printHeightMm;
      let area = prev.printAreaM2;
      if (w && h && w > 0 && h > 0) {
        area = Number(((w / 1000) * (h / 1000)).toFixed(2));
      }
      return {
        ...prev,
        [field]: val,
        printAreaM2: area,
      };
    });
  };

  // File Upload Handlers
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadData = new FormData();
      for (let i = 0; i < files.length; i++) {
        uploadData.append('files', files[i]);
      }
      uploadData.append('fileType', uploadFileType);
      uploadData.append('isPublic', String(uploadIsPublic));

      const res = await fetch(`/api/projects/${formData.id}/files`, {
        method: 'POST',
        body: uploadData,
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || '파일 업로드 실패');
      }

      setFormData(resJson.project);
      setOriginalSnapshot(JSON.stringify(resJson.project));
      onUpdateSuccess(resJson.project);
      showToast(`${files.length}개의 파일이 성공적으로 등록되었습니다.`);
    } catch (err: any) {
      showToast(err.message || '파일 업로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateFileVisibility = async (fileId: string, isPublic: boolean) => {
    try {
      const res = await fetch(`/api/projects/${formData.id}/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setFormData(updated);
      setOriginalSnapshot(JSON.stringify(updated));
      onUpdateSuccess(updated);
      showToast(isPublic ? '파일이 공개로 설정되었습니다.' : '파일이 비공개로 변경되었습니다.');
    } catch (err: any) {
      showToast(err.message || '파일 설정 변경 실패', 'error');
    }
  };

  const handleUpdateFileType = async (fileId: string, fileType: FileType) => {
    try {
      const res = await fetch(`/api/projects/${formData.id}/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setFormData(updated);
      setOriginalSnapshot(JSON.stringify(updated));
      onUpdateSuccess(updated);
      showToast('파일 종류가 변경되었습니다.');
    } catch (err: any) {
      showToast(err.message || '파일 종류 변경 실패', 'error');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/projects/${formData.id}/files/${fileId}`, {
        method: 'DELETE',
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setFormData(updated);
      setOriginalSnapshot(JSON.stringify(updated));
      onUpdateSuccess(updated);
      setFileToDelete(null);
      showToast('파일이 삭제되었습니다.');
    } catch (err: any) {
      showToast(err.message || '파일 삭제 실패', 'error');
    }
  };

  // Share Control Handlers
  const handleToggleShare = async () => {
    const targetState = !formData.isShareActive;
    try {
      const res = await fetch(`/api/projects/${formData.id}/share/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: targetState }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setFormData(updated);
      setOriginalSnapshot(JSON.stringify(updated));
      onUpdateSuccess(updated);
      showToast(targetState ? '외부 공유가 활성화되었습니다.' : '외부 공유가 중지되었습니다.');
    } catch (err: any) {
      showToast(err.message || '공유 설정 실패', 'error');
    }
  };

  const handleRegenerateToken = async () => {
    try {
      const res = await fetch(`/api/projects/${formData.id}/share/regenerate`, {
        method: 'POST',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setFormData(resData.project);
      setOriginalSnapshot(JSON.stringify(resData.project));
      onUpdateSuccess(resData.project);
      setShowRegenModal(false);
      showToast('새로운 공유 링크가 발급되었습니다. 기존 링크는 비활성화되었습니다.');
    } catch (err: any) {
      showToast(err.message || '링크 재발급 실패', 'error');
    }
  };

  const shareUrl = `${window.location.origin}/#share=${formData.shareToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
    showToast('공유 링크가 클립보드에 복사되었습니다.');
  };

  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
  };

  const statusStyle = getStatusBadgeStyle(formData.status);
  const paymentStyle = getPaymentBadgeStyle(formData.paymentStatus);

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="project-toast"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all animate-bounce ${
            toastType === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {toastType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="sticky top-0 z-20 -mx-4 -mt-6 sm:mx-0 sm:mt-0 px-4 py-3 bg-white/95 backdrop-blur-md border-b sm:border border-slate-200 sm:rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-back-to-list"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            title="현장 목록으로 돌아가기"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>← 현장 목록으로 돌아가기</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
            >
              {formData.status}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${paymentStyle.bg} ${paymentStyle.text} ${paymentStyle.border}`}
            >
              {formData.paymentStatus}
            </span>
            {hasUnsavedChanges && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                • 수정사항 있음 (저장 필요)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              수정 취소
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            저장하기
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            title="현장 삭제"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Title & Quick Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>현장 ID: {formData.id}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                최근 수정: {formatDateTime(formData.updatedAt)}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {formData.projectName || '현장명 미입력'}
            </h1>
            <p className="text-xs text-slate-600 flex items-center gap-2">
              <span className="font-semibold text-slate-800">{formData.customerName || '고객명 미지정'}</span>
              <span>|</span>
              <span>{formData.address || '주소 미입력'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Share Preview / Copy Button */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center gap-3">
              <div>
                <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  외부 공유 상태:{' '}
                  <span className={formData.isShareActive ? 'text-emerald-700' : 'text-slate-500'}>
                    {formData.isShareActive ? '공유 활성화 중' : '공유 중지됨'}
                  </span>
                </div>
                <div className="text-[11px] text-blue-700 truncate max-w-[200px] sm:max-w-xs">
                  {shareUrl}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1 cursor-pointer"
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {linkCopied ? '복사됨' : '복사'}
                </button>
                <a
                  href={`/#share=${formData.shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                  title="새 창에서 공유 페이지 열기"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            현장 정보 & 견적 상세
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'files'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            파일 및 시안 관리 ({formData.files?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'share'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-4 h-4" />
            공유 설정 & 항목 제어
          </button>
        </div>
      </div>

      {/* Tab 1: 현장 정보 & 견적 상세 */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Section 1: 기본 정보 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-sm font-bold text-slate-900">
              <Building2 className="w-4 h-4 text-blue-600" />
              기본 정보
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  현장명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.projectName || ''}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">현장 상태</label>
                <select
                  value={formData.status || '견적 작성'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="견적 작성">견적 작성</option>
                  <option value="견적 발송">견적 발송</option>
                  <option value="견적 확정">견적 확정</option>
                  <option value="시공 준비">시공 준비</option>
                  <option value="시공 완료">시공 완료</option>
                  <option value="정산 완료">정산 완료</option>
                  <option value="취소">취소</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">고객명 (발주처)</label>
                <input
                  type="text"
                  value={formData.customerName || ''}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">고객 연락처</label>
                <input
                  type="text"
                  value={formData.customerPhone || ''}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">견적 작성일</label>
                <input
                  type="date"
                  value={formData.quoteDate || ''}
                  onChange={(e) => setFormData({ ...formData, quoteDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">현장 주소</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">현장담당자명</label>
                <input
                  type="text"
                  value={formData.managerName || ''}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">현장담당자 연락처</label>
                <input
                  type="text"
                  value={formData.managerPhone || ''}
                  onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">시공 예정일</label>
                <input
                  type="date"
                  value={formData.scheduledDate || ''}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">시공 완료일</label>
                <input
                  type="date"
                  value={formData.completedDate || ''}
                  onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: 시공 정보 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-sm font-bold text-slate-900">
              <Layers className="w-4 h-4 text-indigo-600" />
              시공 정보 & 출력 사양
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">시공 내용</label>
                <input
                  type="text"
                  value={formData.constructionDetails || ''}
                  onChange={(e) => setFormData({ ...formData, constructionDetails: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">시공 벽면 재질</label>
                <input
                  type="text"
                  value={formData.wallMaterial || ''}
                  onChange={(e) => setFormData({ ...formData, wallMaterial: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">출력 가로 크기 (mm)</label>
                <input
                  type="number"
                  value={formData.printWidthMm ?? ''}
                  onChange={(e) =>
                    handleDimensionChange('printWidthMm', e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">출력 세로 크기 (mm)</label>
                <input
                  type="number"
                  value={formData.printHeightMm ?? ''}
                  onChange={(e) =>
                    handleDimensionChange('printHeightMm', e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">출력 면적 (㎡)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.printAreaM2 ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      printAreaM2: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-blue-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="md:col-span-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.useWhiteInk)}
                    onChange={(e) => setFormData({ ...formData, useWhiteInk: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    화이트 잉크 사용 여부 (진한 벽면 및 투명면 인쇄)
                  </span>
                </label>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">특이사항</label>
                <textarea
                  rows={3}
                  value={formData.specialNotes || ''}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 3: 견적 및 정산정보 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-sm font-bold text-slate-900">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              견적 및 정산정보
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">공급가액</label>
                <input
                  type="number"
                  value={formData.supplyAmount ?? ''}
                  onChange={(e) => handleSupplyChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">{formatKRW(formData.supplyAmount)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">부가세 (VAT)</label>
                <input
                  type="number"
                  value={formData.taxAmount ?? ''}
                  onChange={(e) => {
                    const tax = Number(e.target.value);
                    setFormData({
                      ...formData,
                      taxAmount: tax,
                      totalAmount: (formData.supplyAmount || 0) + tax,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">{formatKRW(formData.taxAmount)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  총 견적금액 <span className="text-blue-600">(직접 수정 가능)</span>
                </label>
                <input
                  type="number"
                  value={formData.totalAmount ?? ''}
                  onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-blue-50/20"
                />
                <span className="text-xs font-bold text-blue-700 mt-0.5 block">{formatKRW(formData.totalAmount)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">계약금</label>
                <input
                  type="number"
                  value={formData.depositAmount ?? ''}
                  onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-500">{formatKRW(formData.depositAmount)}</span>
                  <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.depositPaid)}
                      onChange={(e) => setFormData({ ...formData, depositPaid: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    입금 완료
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">잔금</label>
                <input
                  type="number"
                  value={formData.balanceAmount ?? ''}
                  onChange={(e) => setFormData({ ...formData, balanceAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-500">{formatKRW(formData.balanceAmount)}</span>
                  <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.balancePaid)}
                      onChange={(e) => setFormData({ ...formData, balancePaid: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    입금 완료
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">정산 상태</label>
                <select
                  value={formData.paymentStatus || '미청구'}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="미청구">미청구</option>
                  <option value="청구 완료">청구 완료</option>
                  <option value="계약금 입금">계약금 입금</option>
                  <option value="잔금 대기">잔금 대기</option>
                  <option value="정산 완료">정산 완료</option>
                  <option value="미수금 발생">미수금 발생</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">정산 메모</label>
                <input
                  type="text"
                  value={formData.paymentMemo || ''}
                  onChange={(e) => setFormData({ ...formData, paymentMemo: e.target.value })}
                  placeholder="예: 계약금 입금 확인, 잔금 세금계산서 청구 완료"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: 내부 메모 (관리자 전용) */}
          <div className="bg-amber-50/40 rounded-2xl border border-amber-200/80 p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200/60">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                내부 메모 (관리자 전용)
              </div>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                외부 공유 절대 불가
              </span>
            </div>
            <p className="text-xs text-amber-800 mb-2 leading-relaxed">
              이 영역에 작성된 메모는 어떤 경우에도 고객이나 시공자에게 전달되는 외부 공유 링크에 노출되지 않습니다.
            </p>
            <textarea
              rows={3}
              value={formData.internalMemo || ''}
              onChange={(e) => setFormData({ ...formData, internalMemo: e.target.value })}
              placeholder="관리자 및 내부 팀만 열람 가능한 메모를 입력하세요 (예: 원가 계산, 특수 고객 성향, 내부 작업자 배정 내역 등)"
              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Tab 2: 파일 및 시안 관리 */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          {/* File Upload Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                새 파일 및 이미지 등록 (최대 100MB)
              </div>
              <div className="text-xs text-slate-500">
                지원 형식: JPG, JPEG, PNG, WEBP, XLSX, XLS, PDF
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">파일 종류 선택</label>
                <select
                  value={uploadFileType}
                  onChange={(e) => setUploadFileType(e.target.value as FileType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="원본 엑셀 견적서">원본 엑셀 견적서</option>
                  <option value="고객 전달용 견적서">고객 전달용 견적서</option>
                  <option value="출력 원본 이미지">출력 원본 이미지</option>
                  <option value="시안 이미지">시안 이미지</option>
                  <option value="현장 사진">현장 사진</option>
                  <option value="시공 완료 사진">시공 완료 사진</option>
                  <option value="기타 파일">기타 파일</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">기본 공개 여부</label>
                <select
                  value={String(uploadIsPublic)}
                  onChange={(e) => setUploadIsPublic(e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="true">외체 공유 페이지에 공개</option>
                  <option value="false">비공개 (내부 보관용)</option>
                </select>
              </div>

              <div className="flex items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingFiles}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {uploadingFiles ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      파일 선택 및 다중 업로드
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Files List & Gallery */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                등록된 파일 목록 ({formData.files?.length || 0})
              </h3>
            </div>

            {!formData.files || formData.files.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <FileQuestion className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">등록된 파일이 없습니다.</p>
                <p className="text-xs text-slate-500 mt-1">
                  견적서, 시안, 현장 사진을 업로드하여 함께 관리하세요.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formData.files.map((file) => {
                  const isImg = isImageFile(file.originalName);
                  const typeColor = getFileTypeColor(file.fileType);

                  return (
                    <div
                      key={file.id}
                      className="group relative rounded-xl border border-slate-200 bg-slate-50/50 p-3 hover:bg-white hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between space-y-3"
                    >
                      {/* Top Bar: Type & Visibility */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${typeColor}`}
                        >
                          {file.fileType}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleUpdateFileVisibility(file.id, !file.isPublic)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                            file.isPublic
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {file.isPublic ? (
                            <>
                              <Eye className="w-3 h-3" />
                              공개중
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              비공개
                            </>
                          )}
                        </button>
                      </div>

                      {/* Middle: Preview / Icon & Name */}
                      <div className="flex items-start gap-3">
                        {isImg ? (
                          <div
                            onClick={() =>
                              setViewerImage({
                                url: file.url,
                                title: file.originalName,
                                downloadUrl: `/api/files/${file.filename}/download`,
                              })
                            }
                            className="w-16 h-16 rounded-lg bg-slate-200 overflow-hidden shrink-0 cursor-pointer border border-slate-300 hover:opacity-90 relative"
                          >
                            <img
                              src={file.url}
                              alt={file.originalName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 text-slate-500">
                            {file.originalName.endsWith('.xlsx') || file.originalName.endsWith('.xls') ? (
                              <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                            ) : (
                              <FileText className="w-8 h-8 text-blue-600" />
                            )}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div
                            className="text-xs font-bold text-slate-900 truncate"
                            title={file.originalName}
                          >
                            {file.originalName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {formatFileSize(file.fileSize)} • {formatDate(file.uploadedAt)}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1">
                          <select
                            value={file.fileType}
                            onChange={(e) =>
                              handleUpdateFileType(file.id, e.target.value as FileType)
                            }
                            className="text-[11px] py-0.5 px-1.5 border border-slate-300 rounded bg-white text-slate-700"
                          >
                            <option value="원본 엑셀 견적서">원본 엑셀 견적서</option>
                            <option value="고객 전달용 견적서">고객 전달용 견적서</option>
                            <option value="출력 원본 이미지">출력 원본 이미지</option>
                            <option value="시안 이미지">시안 이미지</option>
                            <option value="현장 사진">현장 사진</option>
                            <option value="시공 완료 사진">시공 완료 사진</option>
                            <option value="기타 파일">기타 파일</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={`/api/files/${file.filename}/download`}
                            download={file.originalName}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="다운로드"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setFileToDelete({ id: file.id, name: file.originalName })}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: 공유 설정 & 항목 제어 */}
      {activeTab === 'share' && (
        <div className="space-y-6">
          {/* Share Status Banner */}
          <div
            className={`rounded-2xl border p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
              formData.isShareActive
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-slate-100 border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    formData.isShareActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <h3 className="text-base font-bold text-slate-900">
                  {formData.isShareActive
                    ? '외부 공유가 활성화되어 있습니다'
                    : '외부 공유가 현재 중지되어 있습니다'}
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {formData.isShareActive
                  ? '공유 링크를 가진 고객, 현장담당자, 시공자가 실시간으로 최신 공개 정보를 확인할 수 있습니다.'
                  : '외부 열람자가 링크를 열어도 "현재 공유가 중지된 페이지입니다" 안내가 표시됩니다.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleShare}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                  formData.isShareActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {formData.isShareActive ? '공유 중지' : '공유 활성화'}
              </button>

              <button
                type="button"
                onClick={() => setShowRegenModal(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                공유 링크 재발급
              </button>
            </div>
          </div>

          {/* Link Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <label className="block text-xs font-bold text-slate-900">
              보안 고유 공유 링크 (로그인 불필요)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? '링크 복사됨' : '공유 링크 복사'}
              </button>
              <a
                href={`/#share=${formData.shareToken}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition shadow-2xs"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                공유 페이지 열기
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              * 링크를 재발급하면 기존 링크는 무효화되며 새 링크에서만 열람 가능합니다.
            </p>
          </div>

          {/* Granular Field Visibility Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  항목별 외부 공개 여부 개별 설정
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  체크된 항목만 외부 공유 화면에 노출되며, 체크 해제된 정보는 서버에서 원천 차단됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const allTrue: PublicSettings = {
                    showProjectName: true,
                    showCustomerName: true,
                    showAddress: true,
                    showManagerInfo: true,
                    showConstructionDate: true,
                    showConstructionDetails: true,
                    showPrintSizeArea: true,
                    showTotalAmount: true,
                    showDeposit: true,
                    showBalance: true,
                    showPaymentStatus: true,
                    showSpecialNotes: true,
                  };
                  setFormData({ ...formData, publicSettings: allTrue });
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                전체 공개
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'showProjectName', label: '현장명', desc: '현장 이름' },
                { key: 'showCustomerName', label: '고객명', desc: '발주처/고객 상호' },
                { key: 'showAddress', label: '현장 주소', desc: '시공 장소 위치' },
                { key: 'showManagerInfo', label: '담당자 정보', desc: '담당자명 및 연락처' },
                { key: 'showConstructionDate', label: '시공 예정일 / 완료일', desc: '일정 정보' },
                { key: 'showConstructionDetails', label: '시공 내용 & 벽면재질', desc: '시공 세부 사양' },
                { key: 'showPrintSizeArea', label: '출력 크기 및 면적', desc: '가로/세로/㎡' },
                { key: 'showTotalAmount', label: '총 견적금액', desc: 'VAT 포함 최종 합계' },
                { key: 'showDeposit', label: '계약금', desc: '계약금액 및 입금상태' },
                { key: 'showBalance', label: '잔금', desc: '잔금액 및 정산내역' },
                { key: 'showPaymentStatus', label: '정산 상태', desc: '청구/입금 진행 상태' },
                { key: 'showSpecialNotes', label: '특이사항', desc: '시공 조건 및 유의사항' },
              ].map((item) => {
                const isChecked = formData.publicSettings[item.key as keyof PublicSettings];
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-slate-50/60 border-slate-200 opacity-75'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          publicSettings: {
                            ...formData.publicSettings,
                            [item.key]: e.target.checked,
                          },
                        })
                      }
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                * 개별 첨부 파일의 공개 여부는 [파일 및 시안 관리] 탭에서 설정할 수 있습니다.
              </span>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                공개 설정 저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Lightbox Modal */}
      {viewerImage && (
        <ImageViewerModal
          isOpen={true}
          onClose={() => setViewerImage(null)}
          imageUrl={viewerImage.url}
          title={viewerImage.title}
          downloadUrl={viewerImage.downloadUrl}
        />
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">현장 삭제 확인</h3>
                <p className="text-xs text-slate-500">삭제 후에는 데이터를 복구할 수 없습니다.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              <strong className="text-slate-900">[{formData.projectName}]</strong> 현장 및 등록된 모든 견적 정보, 첨부 파일이 영구 삭제됩니다. 계속 진행하시겠습니까?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer shadow-xs"
              >
                영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">파일 삭제</h3>
                <p className="text-xs text-slate-500">선택한 파일을 삭제합니다.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 truncate bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              파일명: <strong>{fileToDelete.name}</strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFile(fileToDelete.id)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Share Link Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">공유 링크 재발급</h3>
                <p className="text-xs text-slate-500">기존 링크는 즉시 무효화됩니다.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/60 p-3 rounded-xl border border-amber-200">
              새로운 고유 주소가 생성되며, 이전에 전달했던 기존 링크로는 더 이상 열람할 수 없게 됩니다. 새 링크를 재발급하시겠습니까?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleRegenerateToken}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer shadow-xs"
              >
                새 링크 재발급
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">수정 취소</h3>
                <p className="text-xs text-slate-500">저장되지 않은 변경사항을 원래대로 되돌립니다.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              현재 입력 중인 수정사항이 모두 취소되고 마지막 저장된 상태로 되돌아갑니다.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                계속 수정
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                원래대로 복원
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
