import { ProjectStatus, PaymentStatus, FileType } from '../types';

export function formatKRW(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0원';
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount)) + '원';
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // If it's already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      return dateStr;
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr || '-';
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return dateStr || '-';
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getStatusBadgeStyle(status: ProjectStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case '견적 작성':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
    case '견적 발송':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case '견적 확정':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case '시공 준비':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
    case '시공 완료':
      return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
    case '정산 완료':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case '취소':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  }
}

export function getPaymentBadgeStyle(status: PaymentStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case '미청구':
      return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
    case '청구 완료':
      return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' };
    case '계약금 입금':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case '잔금 대기':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case '정산 완료':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case '미수금 발생':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  }
}

export function getFileTypeColor(type: FileType): string {
  switch (type) {
    case '원본 엑셀 견적서':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case '고객 전달용 견적서':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case '출력 원본 이미지':
      return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case '시안 이미지':
      return 'text-violet-700 bg-violet-50 border-violet-200';
    case '현장 사진':
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case '시공 완료 사진':
      return 'text-teal-700 bg-teal-50 border-teal-200';
    default:
      return 'text-slate-700 bg-slate-100 border-slate-200';
  }
}
