import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  Calendar,
  DollarSign,
  Layers,
  FileText,
  Check,
  Zap,
  Info,
  CheckCheck
} from 'lucide-react';
import { ProjectItem, ExtractedExcelData, ProjectFile, ProjectStatus, PaymentStatus } from '../types';
import { formatKRW } from '../utils/formatters';
import { parseExcelClientSide } from '../utils/excelParserClient';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProject: ProjectItem) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedOriginalFile, setUploadedOriginalFile] = useState<ProjectFile | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [detectedSheet, setDetectedSheet] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiFieldsCount, setAiFieldsCount] = useState<number>(0);
  
  // Form fields for Step 2 Review & Edit
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [constructionDetails, setConstructionDetails] = useState('');
  const [wallMaterial, setWallMaterial] = useState('');
  const [printWidthMm, setPrintWidthMm] = useState<string>('');
  const [printHeightMm, setPrintHeightMm] = useState<string>('');
  const [printAreaM2, setPrintAreaM2] = useState<string>('');
  const [useWhiteInk, setUseWhiteInk] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  const [supplyAmount, setSupplyAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [balanceAmount, setBalanceAmount] = useState<number>(0);
  const [depositDueDate, setDepositDueDate] = useState('');
  const [paymentMemo, setPaymentMemo] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('견적 작성');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('미청구');
  const [internalMemo, setInternalMemo] = useState('');

  const [saving, setSaving] = useState(false);
  const [showOptionalSpecs, setShowOptionalSpecs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setStep('upload');
    setErrorMsg('');
    setUploadedOriginalFile(null);
    setAiSummary('');
    setAiFieldsCount(0);
    setProjectName('');
    setCustomerName('');
    setCustomerPhone('');
    setAddress('');
    setManagerName('');
    setManagerPhone('');
    setQuoteDate(new Date().toISOString().split('T')[0]);
    setScheduledDate('');
    setConstructionDetails('');
    setWallMaterial('');
    setPrintWidthMm('');
    setPrintHeightMm('');
    setPrintAreaM2('');
    setUseWhiteInk(false);
    setSpecialNotes('');
    setSupplyAmount(0);
    setTaxAmount(0);
    setTotalAmount(0);
    setDepositAmount(0);
    setBalanceAmount(0);
    setDepositDueDate('');
    setPaymentMemo('');
    setStatus('견적 작성');
    setPaymentStatus('미청구');
    setInternalMemo('');
    setShowOptionalSpecs(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const applyExtractedData = (data: ExtractedExcelData, originalFile?: ProjectFile, sheets?: string[]) => {
    // Only set fields that exist in the parsed data, empty otherwise
    setProjectName(data.projectName || '');
    setCustomerName(data.customerName || '');
    setCustomerPhone(data.customerPhone || '');
    setAddress(data.address || '');
    setManagerName(data.managerName || '');
    setManagerPhone(data.managerPhone || '');
    setQuoteDate(data.quoteDate || new Date().toISOString().split('T')[0]);
    setScheduledDate(data.scheduledDate || '');
    setConstructionDetails(data.constructionDetails || '');
    setWallMaterial(data.wallMaterial || '');
    setPrintWidthMm(data.printWidthMm ? String(data.printWidthMm) : '');
    setPrintHeightMm(data.printHeightMm ? String(data.printHeightMm) : '');
    setPrintAreaM2(data.printAreaM2 ? String(data.printAreaM2) : '');
    setUseWhiteInk(!!data.useWhiteInk);
    setSupplyAmount(data.supplyAmount || 0);
    setTaxAmount(data.taxAmount || 0);
    setTotalAmount(data.totalAmount || 0);
    setDepositAmount(data.depositAmount || 0);
    setBalanceAmount(data.balanceAmount || 0);
    setDepositDueDate(data.depositDueDate || '');
    setPaymentMemo(data.paymentMemo || '');
    setSpecialNotes(data.specialNotes || '');
    if (data.detectedSheetName) setDetectedSheet(data.detectedSheetName);
    if (data.aiLearnedSummary) setAiSummary(data.aiLearnedSummary);
    if (data.aiExtractedFieldsCount) setAiFieldsCount(data.aiExtractedFieldsCount);

    if (data.printWidthMm || data.printHeightMm || data.wallMaterial || data.constructionDetails) {
      setShowOptionalSpecs(true);
    }

    if (originalFile) {
      setUploadedOriginalFile(originalFile);
    }
    if (sheets) {
      setSheetNames(sheets);
    }

    setStep('review');
  };

  const handleFileUpload = async (file: File) => {
    setErrorMsg('');
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      setErrorMsg('지원하지 않는 파일 형식입니다. .xlsx 또는 .xls 엑셀 파일을 업로드해주세요.');
      return;
    }

    setParsing(true);
    try {
      // 1. Instant client-side parsing (< 50ms) - completely safe from server timeouts/HTML errors
      const arrayBuffer = await file.arrayBuffer();
      const localResult = parseExcelClientSide(arrayBuffer, file.name);

      // Create initial local ProjectFile record
      const tempFileInfo: ProjectFile = {
        id: 'file-' + Date.now().toString(36),
        projectId: '',
        originalName: file.name,
        filename: file.name,
        fileType: '원본 엑셀 견적서',
        fileSize: file.size,
        mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedAt: new Date().toISOString(),
        isPublic: false,
        url: '',
      };

      // Immediately populate UI with extracted data
      applyExtractedData(localResult.extracted, tempFileInfo, localResult.sheetNames);

      // 2. Server upload & AI enrichment (async/safe)
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/projects/parse-excel', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const resData = await res.json();
            if (resData && resData.success && resData.extracted) {
              applyExtractedData(resData.extracted, resData.originalFile, resData.sheetNames);
            }
          }
        }
      } catch (serverErr) {
        console.warn('Server AI enrichment skipped, using local parsed data:', serverErr);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '엑셀 파일을 분석하는 도중 오류가 발생했습니다.');
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Recalculate amounts if supplyAmount changes
  const handleSupplyChange = (val: number) => {
    setSupplyAmount(val);
    const tax = Math.round(val * 0.1);
    setTaxAmount(tax);
    const tot = val + tax;
    setTotalAmount(tot);
    setDepositAmount(Math.round(tot * 0.5));
    setBalanceAmount(tot - Math.round(tot * 0.5));
  };

  // Recalculate area if width/height mm changes
  const handleWidthChange = (w: string) => {
    setPrintWidthMm(w);
    const numW = parseFloat(w);
    const numH = parseFloat(printHeightMm);
    if (!isNaN(numW) && !isNaN(numH) && numW > 0 && numH > 0) {
      setPrintAreaM2(((numW / 1000) * (numH / 1000)).toFixed(2));
    }
  };

  const handleHeightChange = (h: string) => {
    setPrintHeightMm(h);
    const numW = parseFloat(printWidthMm);
    const numH = parseFloat(h);
    if (!isNaN(numW) && !isNaN(numH) && numW > 0 && numH > 0) {
      setPrintAreaM2(((numW / 1000) * (numH / 1000)).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setErrorMsg('현장명은 반드시 입력해야 합니다.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const files: ProjectFile[] = [];
      if (uploadedOriginalFile) {
        files.push(uploadedOriginalFile);
      }

      const payload = {
        projectName: projectName.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        managerName: managerName.trim(),
        managerPhone: managerPhone.trim(),
        quoteDate,
        scheduledDate,
        completedDate: '',
        constructionDetails: constructionDetails.trim(),
        wallMaterial: wallMaterial.trim(),
        printWidthMm: printWidthMm ? Number(printWidthMm) : null,
        printHeightMm: printHeightMm ? Number(printHeightMm) : null,
        printAreaM2: printAreaM2 ? Number(printAreaM2) : null,
        useWhiteInk,
        specialNotes: specialNotes.trim(),
        supplyAmount: Number(supplyAmount) || 0,
        taxAmount: Number(taxAmount) || 0,
        totalAmount: Number(totalAmount) || 0,
        depositAmount: Number(depositAmount) || 0,
        balanceAmount: Number(balanceAmount) || 0,
        depositPaid: false,
        balancePaid: false,
        depositDueDate,
        paymentMemo: paymentMemo.trim(),
        status,
        paymentStatus,
        internalMemo: internalMemo.trim(),
        files,
        isShareActive: true,
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const savedProject = await res.json();
      if (!res.ok) {
        throw new Error(savedProject.error || '현장 저장에 실패했습니다.');
      }

      resetForm();
      onSuccess(savedProject);
    } catch (err: any) {
      setErrorMsg(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="new-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="new-project-modal-container"
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">새 현장 등록</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  견적서 AI 자동 학습
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === 'upload'
                  ? '엑셀 견적서만 업로드하면 현장 정보, 출력 사양, 견적 금액을 알아서 학습해 자동 입력합니다'
                  : '견적서에서 자동 추출·학습된 항목을 확인하고 저장하세요'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">안내</p>
                <p className="mt-0.5 text-xs text-rose-700">{errorMsg}</p>
              </div>
            </div>
          )}

          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                id="excel-dropzone"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !parsing && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/60 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {parsing ? (
                  <div className="flex flex-col items-center py-4 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
                      <Sparkles className="w-7 h-7 animate-spin" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">
                        월펜 AI가 견적서를 자동 학습하고 있습니다...
                      </p>
                      <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                        현장명, 고객처, 시공 주소, 출력 가로·세로 규격(mm), 면적(㎡), 공급가액, 계약금·잔금, 특이사항을 자동으로 분석하고 있습니다.
                      </p>
                    </div>
                    <div className="w-64 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-full animate-indeterminate rounded-full" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
                      <UploadCloud className="w-8 h-8" />
                    </div>

                    <p className="text-base font-bold text-slate-800">
                      엑셀 견적서 파일을 여기에 끌어다 놓으세요
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500 max-w-sm">
                      지원 형식: <strong className="text-slate-700 font-semibold">.xlsx, .xls</strong> (최대 100MB)
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition cursor-pointer">
                      <FileSpreadsheet className="w-4 h-4" />
                      컴퓨터에서 엑셀 견적서 선택
                    </div>
                  </>
                )}
              </div>

              {/* AI Auto-learn Capability Banner */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>엑셀 업로드 시 AI가 자동으로 인식하여 채워주는 항목</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200/80 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>현장명 / 고객명 / 연락처</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200/80 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>현장 주소 / 시공 예정일</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200/80 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>출력 가로×세로(mm) / ㎡</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200/80 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>공급가 / 부가세 / 총액 / 잔금</span>
                  </div>
                </div>
              </div>

              {/* Sample Template & Direct Manual Register */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl border">
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>테스트용 견적서 엑셀 양식이 필요하신가요?</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href="/api/projects/sample-template"
                    download="Wallpen_Sample_Estimate.xlsx"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    샘플 견적서 다운로드
                  </a>
                  <button
                    type="button"
                    onClick={() => setStep('review')}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-300 transition cursor-pointer"
                  >
                    엑셀 없이 직접 입력
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Review and Edit Form (All auto-filled) */
            <form id="project-review-form" onSubmit={handleSubmit} className="space-y-6">
              {/* AI Auto-Extraction Briefing Card */}
              {uploadedOriginalFile && (
                <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 sm:p-5 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/15">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shrink-0">
                        <CheckCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold tracking-tight">견적서 자동 학습 및 입력 완료</h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400 text-slate-900">
                            완전 자동 매핑
                          </span>
                        </div>
                        <p className="text-xs text-blue-100 mt-0.5">
                          원본 파일: <span className="font-semibold text-white">{uploadedOriginalFile.originalName}</span> (시트: {detectedSheet || '견적서'})
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep('upload')}
                      className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition backdrop-blur-xs cursor-pointer"
                    >
                      다른 엑셀 파일 올리기
                    </button>
                  </div>

                  {aiSummary && (
                    <div className="mt-3 text-xs text-blue-50 bg-black/15 rounded-xl p-3 leading-relaxed flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <span>{aiSummary}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Section 1: 기본 정보 */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    1. 기본 현장 정보
                  </div>
                  {projectName && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 자동 입력됨
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      현장명 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="예: 성수동 복합문화공간 메인홀 벽면프린팅"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">고객명 (발주처)</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="예: 성수 아트스페이스 (대표 이민호)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">고객 연락처</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="예: 010-1234-5678"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">현장 주소</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="예: 서울특별시 성동구 아차산로 17길 48 지하 1층 메인홀"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">견적 작성일</label>
                    <input
                      type="date"
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">시공 예정일</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">담당자명</label>
                    <input
                      type="text"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="담당자 이름 (선택)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">담당자 연락처</label>
                    <input
                      type="text"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="담당자 연락처 (선택)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: 견적 및 정산 정보 */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-2xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    2. 견적 및 정산 내역
                  </div>
                  {totalAmount > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 총액 {formatKRW(totalAmount)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">공급가액 (원)</label>
                    <input
                      type="number"
                      value={supplyAmount || ''}
                      onChange={(e) => handleSupplyChange(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{formatKRW(supplyAmount)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">부가세 (VAT, 원)</label>
                    <input
                      type="number"
                      value={taxAmount || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTaxAmount(val);
                        setTotalAmount(supplyAmount + val);
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{formatKRW(taxAmount)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      총 견적금액 (원)
                    </label>
                    <input
                      type="number"
                      value={totalAmount || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTotalAmount(val);
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-blue-50/20"
                    />
                    <span className="text-xs font-bold text-blue-700 mt-0.5 block">{formatKRW(totalAmount)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">계약금 (원)</label>
                    <input
                      type="number"
                      value={depositAmount || ''}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{formatKRW(depositAmount)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">잔금 (원)</label>
                    <input
                      type="number"
                      value={balanceAmount || ''}
                      onChange={(e) => setBalanceAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{formatKRW(balanceAmount)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">입금 예정일</label>
                    <input
                      type="date"
                      value={depositDueDate}
                      onChange={(e) => setDepositDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">정산/결제 메모</label>
                    <input
                      type="text"
                      value={paymentMemo}
                      onChange={(e) => setPaymentMemo(e.target.value)}
                      placeholder="예: 계약금 50% 입금 확인 후 시공 진행, 잔금은 검수 완료 당일"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: 특이사항 및 시공조건 */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-2xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
                  <FileText className="w-4 h-4 text-slate-700" />
                  3. 특이사항 및 시공조건
                </div>
                <div>
                  <textarea
                    rows={2}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="견적서 상의 특이사항이나 시공 조건이 있을 경우 입력하세요"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* Section 4: 시공 세부 사양 (선택 입력) */}
              <div className="rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-700">4. 시공 세부 사양 및 출력 규격 (선택 사항)</span>
                      <p className="text-[11px] text-slate-500">※ 엑셀 견적서에 별도 규격이나 사양이 없는 경우 비워두셔도 됩니다.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOptionalSpecs(!showOptionalSpecs)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                  >
                    {showOptionalSpecs ? '사양 입력창 접기' : '사양 입력창 열기'}
                  </button>
                </div>

                {showOptionalSpecs && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-slate-200">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">시공 내용 (품명/사양)</label>
                      <input
                        type="text"
                        value={constructionDetails}
                        onChange={(e) => setConstructionDetails(e.target.value)}
                        placeholder="예: 대형 수직 벽면 UV 월프린팅 시공"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">시공 벽면 재질</label>
                      <input
                        type="text"
                        value={wallMaterial}
                        onChange={(e) => setWallMaterial(e.target.value)}
                        placeholder="예: 수성 도장 콘크리트 벽면"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">출력 가로 크기 (mm)</label>
                      <input
                        type="number"
                        value={printWidthMm}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        placeholder="가로 mm"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">출력 세로 크기 (mm)</label>
                      <input
                        type="number"
                        value={printHeightMm}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        placeholder="세로 mm"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">출력 면적 (㎡ / 헤베)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={printAreaM2}
                        onChange={(e) => setPrintAreaM2(e.target.value)}
                        placeholder="㎡"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold text-blue-700 bg-white"
                      />
                    </div>

                    <div className="md:col-span-3 flex items-center gap-3 pt-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useWhiteInk}
                          onChange={(e) => setUseWhiteInk(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          화이트 잉크 사용 (어두운 벽면/투명면 전용 하도 출력)
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: 상태 및 내부 관리자 메모 */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-2xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
                  <FileText className="w-4 h-4 text-amber-600" />
                  5. 현장 상태 및 관리자 전용 메모
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">현장 상태</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">정산 상태</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                    >
                      <option value="미청구">미청구</option>
                      <option value="청구 완료">청구 완료</option>
                      <option value="계약금 입금">계약금 입금</option>
                      <option value="잔금 대기">잔금 대기</option>
                      <option value="정산 완료">정산 완료</option>
                      <option value="미수금 발생">미수금 발생</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">내부 메모 (관리자 전용)</label>
                      <span className="text-[11px] text-rose-600 font-semibold">
                        * 외부 공유 페이지에 절대 표시되지 않습니다
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={internalMemo}
                      onChange={(e) => setInternalMemo(e.target.value)}
                      placeholder="관리자 및 내부 시공팀만 열람 가능한 메모 (예: 담당자 성향, 사전 현장답사 결과 등)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between">
          {step === 'review' ? (
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              이전 단계
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              취소
            </button>
          )}

          {step === 'review' && (
            <button
              type="submit"
              form="project-review-form"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  이대로 현장 등록하기
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
