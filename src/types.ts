export type ProjectStatus =
  | '견적 작성'
  | '견적 발송'
  | '견적 확정'
  | '시공 준비'
  | '시공 완료'
  | '정산 완료'
  | '취소';

export type PaymentStatus =
  | '미청구'
  | '청구 완료'
  | '계약금 입금'
  | '잔금 대기'
  | '정산 완료'
  | '미수금 발생';

export type FileType =
  | '원본 엑셀 견적서'
  | '고객 전달용 견적서'
  | '출력 원본 이미지'
  | '시안 이미지'
  | '현장 사진'
  | '시공 완료 사진'
  | '기타 파일';

export interface ProjectFile {
  id: string;
  projectId: string;
  originalName: string;
  filename: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  isPublic: boolean;
  url: string;
}

export interface PublicSettings {
  showProjectName: boolean;
  showCustomerName: boolean;
  showAddress: boolean;
  showManagerInfo: boolean;
  showConstructionDate: boolean;
  showConstructionDetails: boolean;
  showPrintSizeArea: boolean;
  showTotalAmount: boolean;
  showDeposit: boolean;
  showBalance: boolean;
  showPaymentStatus: boolean;
  showSpecialNotes: boolean;
}

export interface ProjectItem {
  id: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  address: string;
  managerName: string;
  managerPhone: string;
  quoteDate: string; // YYYY-MM-DD
  scheduledDate: string; // YYYY-MM-DD
  completedDate: string; // YYYY-MM-DD
  constructionDetails: string;
  wallMaterial: string;
  printWidthMm: number | null;
  printHeightMm: number | null;
  printAreaM2: number | null;
  useWhiteInk: boolean;
  specialNotes: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  depositPaid: boolean;
  balancePaid: boolean;
  depositDueDate: string;
  paymentMemo: string;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  internalMemo: string;
  files: ProjectFile[];
  publicSettings: PublicSettings;
  isShareActive: boolean;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedExcelData {
  projectName?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  managerName?: string;
  managerPhone?: string;
  quoteDate?: string;
  scheduledDate?: string;
  constructionDetails?: string;
  wallMaterial?: string;
  printWidthMm?: number;
  printHeightMm?: number;
  printAreaM2?: number;
  useWhiteInk?: boolean;
  supplyAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  depositAmount?: number;
  balanceAmount?: number;
  depositDueDate?: string;
  paymentMemo?: string;
  specialNotes?: string;
  internalMemo?: string;
  detectedSheetName?: string;
  rawCellsCount?: number;
  aiLearnedSummary?: string;
  aiConfidence?: number;
  aiExtractedFieldsCount?: number;
}

export interface PublicProjectView {
  shareToken: string;
  projectName?: string;
  customerName?: string;
  address?: string;
  managerName?: string;
  managerPhone?: string;
  quoteDate?: string;
  scheduledDate?: string;
  completedDate?: string;
  constructionDetails?: string;
  wallMaterial?: string;
  printWidthMm?: number | null;
  printHeightMm?: number | null;
  printAreaM2?: number | null;
  useWhiteInk?: boolean;
  specialNotes?: string;
  totalAmount?: number;
  depositAmount?: number;
  balanceAmount?: number;
  paymentStatus?: PaymentStatus;
  status?: ProjectStatus;
  files: Array<{
    id: string;
    originalName: string;
    fileType: FileType;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    url: string;
    downloadUrl: string;
  }>;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}
