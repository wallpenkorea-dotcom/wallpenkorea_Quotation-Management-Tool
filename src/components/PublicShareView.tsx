import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  FileText,
  Layers,
  Download,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Eye,
  Clock,
  Sparkles,
  Phone,
  User,
  ShieldCheck,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { PublicProjectView, FileType } from '../types';
import { formatKRW, formatDate, formatDateTime, formatFileSize, getStatusBadgeStyle, getPaymentBadgeStyle, getFileTypeColor } from '../utils/formatters';
import { ImageViewerModal } from './ImageViewerModal';

interface PublicShareViewProps {
  token: string;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ token }) => {
  const [data, setData] = useState<PublicProjectView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorCode, setErrorCode] = useState<'NOT_FOUND' | 'SHARE_INACTIVE' | 'ERROR' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Lightbox state
  const [viewerImage, setViewerImage] = useState<{ url: string; title: string; downloadUrl?: string } | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string>('/wallpen-banner.svg');

  useEffect(() => {
    fetch('/api/settings/banner')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.bannerUrl) {
          setBannerUrl(data.bannerUrl);
        }
      })
      .catch(() => {});
  }, []);

  const fetchPublicData = async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const res = await fetch(`/api/public/share/${token}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 403 || errJson.error === 'SHARE_INACTIVE') {
          setErrorCode('SHARE_INACTIVE');
        } else if (res.status === 404 || errJson.error === 'NOT_FOUND') {
          setErrorCode('NOT_FOUND');
        } else {
          setErrorCode('ERROR');
        }
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setErrorCode('ERROR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, [token]);

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPageText = () => {
    if (!data) return;

    const lines: string[] = [];
    lines.push('[ 월펜코리아 벽면프린트 시공 안내 ]');
    if (data.projectName) lines.push(`■ 현장명: ${data.projectName}`);
    if (data.customerName) lines.push(`■ 고객/발주처: ${data.customerName}`);
    if (data.address) lines.push(`■ 현장 주소: ${data.address}`);
    if (data.managerName) lines.push(`■ 현장 담당자: ${data.managerName} ${data.managerPhone ? `(${data.managerPhone})` : ''}`);
    if (data.scheduledDate) lines.push(`■ 시공 예정일: ${data.scheduledDate}`);
    if (data.completedDate) lines.push(`■ 시공 완료일: ${data.completedDate}`);
    if (data.constructionDetails) lines.push(`■ 시공 내용: ${data.constructionDetails}`);
    if (data.wallMaterial) lines.push(`■ 벽면 재질: ${data.wallMaterial}`);
    if (data.printWidthMm && data.printHeightMm) {
      lines.push(`■ 출력 규격: ${data.printWidthMm}mm × ${data.printHeightMm}mm (면적: ${data.printAreaM2 || '-'}㎡)`);
    }
    if (data.totalAmount !== undefined) lines.push(`■ 총 견적금액: ${formatKRW(data.totalAmount)}`);
    if (data.depositAmount !== undefined) lines.push(`■ 계약금: ${formatKRW(data.depositAmount)}`);
    if (data.balanceAmount !== undefined) lines.push(`■ 잔금: ${formatKRW(data.balanceAmount)}`);
    if (data.paymentStatus) lines.push(`■ 정산 상태: ${data.paymentStatus}`);
    if (data.specialNotes) lines.push(`■ 특이사항: \n${data.specialNotes}`);
    
    lines.push('');
    lines.push('※ 담당자가 내용을 수정하면 아래 최신 링크에서 실시간 반영된 내용을 확인하실 수 있습니다.');
    lines.push(`▶ 실시간 확인 링크: ${currentUrl}`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">현장 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  // Error States
  if (errorCode === 'SHARE_INACTIVE') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">현재 공유가 중지된 페이지입니다.</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-md">
          관리자가 해당 현장의 외부 정보 공유를 일시 중지했습니다. 문의사항은 시공 담당자에게 연락해주세요.
        </p>
        <div className="mt-6 text-xs text-slate-400">월펜코리아 (WallPen Korea)</div>
      </div>
    );
  }

  if (errorCode === 'NOT_FOUND' || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">유효하지 않거나 존재하지 않는 링크입니다.</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-md">
          공유 링크가 만료되었거나 재발급되어 주소가 변경되었을 수 있습니다. 최신 링크를 전달받아 다시 확인해주세요.
        </p>
        <div className="mt-6 text-xs text-slate-400">월펜코리아 (WallPen Korea)</div>
      </div>
    );
  }

  const imageFiles = data.files.filter((f) => isImageFile(f.originalName));
  const docFiles = data.files.filter((f) => !isImageFile(f.originalName));

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Banner if available */}
        {bannerUrl && (
          <div className="w-full max-w-4xl mx-auto overflow-hidden rounded-2xl shadow-md border border-slate-800/20 bg-slate-950">
            <img
              src={bannerUrl}
              alt="WallPen Korea"
              className="w-full h-auto max-h-[220px] object-cover block select-none"
            />
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-black tracking-wider text-blue-600 uppercase">
                  월펜코리아 (WallPen Korea)
                </div>
                <h2 className="text-sm font-semibold text-slate-700">
                  벽면프린트 시공 현장 안내
                </h2>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                실시간 공유 활성
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center sm:justify-end gap-1">
                <Clock className="w-3 h-3" />
                마지막 업데이트: {formatDateTime(data.updatedAt)}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {data.projectName || '벽면프린트 시공 현장'}
            </h1>
            {data.customerName && (
              <p className="text-sm font-medium text-slate-600 mt-1">
                발주처/고객: <strong className="text-slate-800">{data.customerName}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Section: 현장 및 시공 상세 사양 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              시공 및 현장 정보
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            {data.address && (
              <div className="md:col-span-2 flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-500">현장 주소</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{data.address}</div>
                </div>
              </div>
            )}

            {data.managerName && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <User className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-500">현장 담당자</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {data.managerName}{' '}
                    {data.managerPhone && (
                      <span className="text-xs font-normal text-slate-600">({data.managerPhone})</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {data.scheduledDate && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Calendar className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-500">시공 예정일</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{formatDate(data.scheduledDate)}</div>
                </div>
              </div>
            )}

            {data.constructionDetails && (
              <div className="md:col-span-2 flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-500">시공 내용</div>
                  <div className="text-sm font-medium text-slate-800 mt-0.5">{data.constructionDetails}</div>
                </div>
              </div>
            )}

            {data.wallMaterial && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs font-semibold text-slate-500">시공 벽면 재질</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{data.wallMaterial}</div>
              </div>
            )}

            {(data.printWidthMm || data.printHeightMm || data.printAreaM2) && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs font-semibold text-slate-500">출력 규격 및 면적</div>
                <div className="text-sm font-bold text-blue-700 mt-0.5">
                  {data.printWidthMm ? `${data.printWidthMm}mm` : '-'} ×{' '}
                  {data.printHeightMm ? `${data.printHeightMm}mm` : '-'}
                  {data.printAreaM2 ? ` (${data.printAreaM2}㎡)` : ''}
                </div>
              </div>
            )}

            {data.useWhiteInk !== undefined && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs font-semibold text-slate-500">화이트 잉크 사용</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {data.useWhiteInk ? '사용 (전용 하도 출력)' : '미사용'}
                </div>
              </div>
            )}

            {data.specialNotes && (
              <div className="md:col-span-2 p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                <div className="text-xs font-bold text-amber-900">특이사항 및 시공 조건</div>
                <div className="text-xs text-amber-950 mt-1.5 whitespace-pre-wrap leading-relaxed">
                  {data.specialNotes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section: 견적 및 정산 내역 (공개 설정된 경우만 렌더링) */}
        {(data.totalAmount !== undefined || data.depositAmount !== undefined || data.balanceAmount !== undefined || data.paymentStatus) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                견적 및 정산 안내
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {data.totalAmount !== undefined && (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-800">총 견적금액</div>
                  <div className="text-lg font-black text-blue-900 mt-1">{formatKRW(data.totalAmount)}</div>
                </div>
              )}

              {data.depositAmount !== undefined && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-600">계약금</div>
                  <div className="text-base font-bold text-slate-900 mt-1">{formatKRW(data.depositAmount)}</div>
                </div>
              )}

              {data.balanceAmount !== undefined && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-600">잔금</div>
                  <div className="text-base font-bold text-slate-900 mt-1">{formatKRW(data.balanceAmount)}</div>
                </div>
              )}

              {data.paymentStatus && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-600">정산 진행 상태</div>
                  <div className="text-base font-bold text-emerald-700 mt-1">{data.paymentStatus}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section: 공개 이미지 갤러리 */}
        {imageFiles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                시안 및 현장 이미지 ({imageFiles.length}장)
              </h3>
              <span className="text-xs text-slate-500">클릭 시 확대 보기</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {imageFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() =>
                    setViewerImage({
                      url: file.url,
                      title: file.originalName,
                      downloadUrl: file.downloadUrl,
                    })
                  }
                  className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square cursor-pointer hover:shadow-lg transition shadow-2xs"
                >
                  <img
                    src={file.url}
                    alt={file.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition p-2.5 flex flex-col justify-between">
                    <span className="self-start text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                      {file.fileType}
                    </span>
                    <div className="text-white">
                      <div className="text-xs font-semibold truncate">{file.originalName}</div>
                      <div className="text-[10px] text-slate-300">{formatFileSize(file.fileSize)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: 공개 문서 및 파일 다운로드 */}
        {docFiles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-600" />
                첨부 문서 및 견적서 다운로드 ({docFiles.length}건)
              </h3>
            </div>

            <div className="space-y-2">
              {docFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{file.originalName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {file.fileType} • {formatFileSize(file.fileSize)}
                      </div>
                    </div>
                  </div>

                  <a
                    href={file.downloadUrl}
                    download={file.originalName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-xs font-semibold text-slate-700 transition shadow-2xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    다운로드
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyPageText}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-[0.98]"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedText ? '내용 복사 완료!' : '페이지 내용 복사 (텍스트)'}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <ExternalLink className="w-4 h-4" />}
              {copiedLink ? '링크 복사 완료!' : '공유 링크 복사'}
            </button>
          </div>

          <div className="text-xs text-slate-400 text-center sm:text-right">
            월펜코리아 고객지원: 010-9876-5432
          </div>
        </div>

        {/* Mandatory Bottom Notice */}
        <div className="p-4 rounded-xl bg-slate-200/60 text-center text-xs text-slate-600 leading-relaxed">
          이 페이지는 현장 진행정보 공유를 위한 페이지이며, 담당자가 내용을 수정하면 최신 정보가 반영됩니다.
        </div>
      </div>

      {/* Lightbox Modal */}
      {viewerImage && (
        <ImageViewerModal
          isOpen={true}
          onClose={() => setViewerImage(null)}
          imageUrl={viewerImage.url}
          title={viewerImage.title}
          downloadUrl={viewerImage.downloadUrl}
        />
      )}
    </div>
  );
};
