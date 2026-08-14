import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  ExternalLink,
  Share2,
  Check,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Clock
} from 'lucide-react';
import { ProjectItem, ProjectStatus, PaymentStatus } from '../types';
import { formatKRW, formatDate, formatDateTime, getStatusBadgeStyle, getPaymentBadgeStyle } from '../utils/formatters';

interface ProjectListProps {
  projects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
  onOpenNewModal: () => void;
  onOpenShareModal?: (project: ProjectItem) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onSelectProject,
  onOpenNewModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('전체');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('전체');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const statusOptions: Array<{ label: string; value: string }> = [
    { label: '전체 상태', value: '전체' },
    { label: '견적 작성', value: '견적 작성' },
    { label: '견적 발송', value: '견적 발송' },
    { label: '견적 확정', value: '견적 확정' },
    { label: '시공 준비', value: '시공 준비' },
    { label: '시공 완료', value: '시공 완료' },
    { label: '정산 완료', value: '정산 완료' },
    { label: '취소', value: '취소' },
  ];

  const paymentOptions: Array<{ label: string; value: string }> = [
    { label: '전체 정산', value: '전체' },
    { label: '미청구', value: '미청구' },
    { label: '청구 완료', value: '청구 완료' },
    { label: '계약금 입금', value: '계약금 입금' },
    { label: '잔금 대기', value: '잔금 대기' },
    { label: '정산 완료', value: '정산 완료' },
    { label: '미수금 발생', value: '미수금 발생' },
  ];

  // Filtered & sorted projects
  const filteredProjects = useMemo(() => {
    if (!Array.isArray(projects)) return [];
    return projects.filter((p) => {
      if (!p) return false;
      const term = searchTerm.trim().toLowerCase();
      const pName = (p.projectName || '').toLowerCase();
      const cName = (p.customerName || '').toLowerCase();
      const addr = (p.address || '').toLowerCase();
      const mName = (p.managerName || '').toLowerCase();

      const matchSearch =
        term === '' ||
        pName.includes(term) ||
        cName.includes(term) ||
        addr.includes(term) ||
        mName.includes(term);

      const matchStatus = selectedStatus === '전체' || p.status === selectedStatus;
      const matchPayment = selectedPaymentStatus === '전체' || p.paymentStatus === selectedPaymentStatus;

      return matchSearch && matchStatus && matchPayment;
    });
  }, [projects, searchTerm, selectedStatus, selectedPaymentStatus]);

  const handleCopyShareLink = (e: React.MouseEvent, token: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#share=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleOpenShareTab = (e: React.MouseEvent, token: string) => {
    e.stopPropagation();
    const url = `/#share=${token}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>현장 관리 목록</span>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              총 {filteredProjects.length}건
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            벽면프린트 시공 현장별 견적, 시안, 현장 사진 및 외부 공유 링크를 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-new-project"
            onClick={onOpenNewModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            새 현장 등록 (엑셀 업로드)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="현장명, 고객명, 주소, 담당자 검색..."
              className="block w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                지우기
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full pl-3 pr-8 py-2.5 text-xs border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Filter */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                id="payment-filter"
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                className="block w-full pl-3 pr-8 py-2.5 text-xs border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                {paymentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(searchTerm || selectedStatus !== '전체' || selectedPaymentStatus !== '전체') && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold">적용된 필터:</span>
            {searchTerm && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                검색어: "{searchTerm}"
              </span>
            )}
            {selectedStatus !== '전체' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                상태: {selectedStatus}
              </span>
            )}
            {selectedPaymentStatus !== '전체' && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                정산: {selectedPaymentStatus}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('전체');
                setSelectedPaymentStatus('전체');
              }}
              className="ml-auto text-blue-600 hover:text-blue-800 font-semibold underline text-xs"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {/* Project List Content */}
      {filteredProjects.length === 0 ? (
        <div
          id="empty-project-list"
          className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs flex flex-col items-center justify-center min-h-[300px]"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-slate-800">
            등록된 현장이 없습니다. 새 현장을 등록해 주세요.
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            엑셀 견적서를 업로드하면 현장 정보와 금액을 자동으로 분석하여 등록할 수 있습니다.
          </p>
          <button
            onClick={onOpenNewModal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            새 현장 등록하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const statusStyle = getStatusBadgeStyle(project.status);
            const paymentStyle = getPaymentBadgeStyle(project.paymentStatus);
            const isCopied = copiedToken === project.shareToken;

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                {/* Left: Main Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      {project.status}
                    </span>

                    {/* Payment badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${paymentStyle.bg} ${paymentStyle.text} ${paymentStyle.border}`}
                    >
                      {project.paymentStatus}
                    </span>

                    {/* Share Status */}
                    {project.isShareActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        공유 활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        공유 중지
                      </span>
                    )}

                    {project.files && project.files.length > 0 && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        첨부파일 {project.files.length}개
                      </span>
                    )}
                  </div>

                  {/* Project Name */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                    {project.projectName}
                  </h3>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-slate-700 shrink-0">고객:</span>
                      <span className="truncate">{project.customerName || '-'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{project.address || '-'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>시공: {formatDate(project.scheduledDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Action Area */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0 gap-3">
                  <div className="text-left lg:text-right">
                    <div className="text-[11px] text-slate-500 font-medium">총 견적금액</div>
                    <div className="text-base font-black text-slate-900 text-blue-700">
                      {formatKRW(project.totalAmount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Copy Share Link Button */}
                    {project.isShareActive && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyShareLink(e, project.shareToken)}
                        title="공유 링크 복사"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">복사됨</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>링크 복사</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* View Details Button */}
                    <button
                      type="button"
                      onClick={() => onSelectProject(project)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-blue-600 transition shadow-2xs group-hover:bg-blue-600"
                    >
                      상세보기
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>최근수정: {formatDateTime(project.updatedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
