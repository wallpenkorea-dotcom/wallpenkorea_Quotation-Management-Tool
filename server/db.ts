import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ProjectItem, PublicProjectView, ProjectFile, PublicSettings } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function generateToken(): string {
  return 'wp_' + crypto.randomBytes(16).toString('hex');
}

export function getDefaultPublicSettings(): PublicSettings {
  return {
    showProjectName: true,
    showCustomerName: true,
    showAddress: true,
    showManagerInfo: true,
    showConstructionDate: true,
    showConstructionDetails: true,
    showPrintSizeArea: true,
    showTotalAmount: true,
    showDeposit: false,
    showBalance: false,
    showPaymentStatus: false,
    showSpecialNotes: true,
  };
}

// Initial realistic seed data
function getInitialProjects(): ProjectItem[] {
  const p1Token = 'wp_demo8f2a9c1e4b7d03a56e89f1c2';
  const p2Token = 'wp_demo4c7a1e9b2d8f03a65e71a3d9';
  const p3Token = 'wp_demo9e1b3d5f7a2c4e680a92b4f1';

  return [
    {
      id: 'proj-1001',
      projectName: '성수동 복합문화공간 메인홀 대형 벽면프린팅',
      customerName: '성수 아트스페이스 (대표 이민호)',
      customerPhone: '010-1234-5678',
      address: '서울특별시 성동구 아차산로 17길 48 지하 1층 메인홀',
      managerName: '김월펜 과장',
      managerPhone: '010-9876-5432',
      quoteDate: '2026-08-10',
      scheduledDate: '2026-08-20',
      completedDate: '',
      constructionDetails: '대형 수직 벽면 UV 월프린팅 (그래픽 아트워크 시공)',
      wallMaterial: '수성 도장 콘크리트 벽면 (평활도 양호)',
      printWidthMm: 6500,
      printHeightMm: 2800,
      printAreaM2: 18.2,
      useWhiteInk: true,
      specialNotes: '1. 현장 220V 단독 전원 필요\n2. 야간 시공 시 사전 출입증 발급 필수\n3. 전용 프라이머 도포 후 본 출력 진행',
      supplyAmount: 4000000,
      taxAmount: 400000,
      totalAmount: 4400000,
      depositAmount: 2200000,
      balanceAmount: 2200000,
      depositPaid: true,
      balancePaid: false,
      depositDueDate: '2026-08-12',
      paymentMemo: '계약금 2,200,000원 입금 확인 완료. 잔금은 시공 검수 당일 결제 예정.',
      status: '시공 준비',
      paymentStatus: '계약금 입금',
      internalMemo: '고객사 대표가 디테일에 민감하므로 해상도 1200dpi 정밀 모드로 출력할 것. 시공 팀장 배정 완료.',
      files: [],
      publicSettings: {
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
      },
      isShareActive: true,
      shareToken: p1Token,
      createdAt: '2026-08-10T10:30:00.000Z',
      updatedAt: '2026-08-13T16:20:00.000Z',
    },
    {
      id: 'proj-1002',
      projectName: '판교 테크원 타워 사내 라운지 브랜드 월 프린트',
      customerName: '(주)넥스트소프트 경영지원팀',
      customerPhone: '031-789-0123',
      address: '경기도 성남시 분당구 판교역로 145 알파돔 8층 사내 라운지',
      managerName: '박시공 대리',
      managerPhone: '010-5555-4321',
      quoteDate: '2026-08-12',
      scheduledDate: '2026-08-25',
      completedDate: '',
      constructionDetails: '사내 라운지 기업 비전 슬로건 및 타이포그래피 일러스트 시공',
      wallMaterial: '석고보드 위 친환경 페인트 도장',
      printWidthMm: 4200,
      printHeightMm: 2400,
      printAreaM2: 10.08,
      useWhiteInk: false,
      specialNotes: '주말(토요일) 시공 진행 요청. 엘리베이터 보양 및 폐기물 수거 철저.',
      supplyAmount: 2500000,
      taxAmount: 250000,
      totalAmount: 2750000,
      depositAmount: 1375000,
      balanceAmount: 1375000,
      depositPaid: false,
      balancePaid: false,
      depositDueDate: '2026-08-18',
      paymentMemo: '전자세금계산서 청구 발행 후 계약금 입금 예정.',
      status: '견적 확정',
      paymentStatus: '청구 완료',
      internalMemo: '건물 관리소 사전 작업신고서 제출 완료. 키 불출은 1층 안내데스크.',
      files: [],
      publicSettings: {
        showProjectName: true,
        showCustomerName: true,
        showAddress: true,
        showManagerInfo: true,
        showConstructionDate: true,
        showConstructionDetails: true,
        showPrintSizeArea: true,
        showTotalAmount: true,
        showDeposit: false,
        showBalance: false,
        showPaymentStatus: false,
        showSpecialNotes: true,
      },
      isShareActive: true,
      shareToken: p2Token,
      createdAt: '2026-08-12T09:15:00.000Z',
      updatedAt: '2026-08-12T14:40:00.000Z',
    },
    {
      id: 'proj-1003',
      projectName: '해운대 베이몬드 호텔 로비 포토존 벽면 그래픽',
      customerName: '베이몬드 호텔앤리조트 시설팀',
      customerPhone: '051-740-9900',
      address: '부산광역시 해운대구 해운대해변로 298번길 24 1층 로비',
      managerName: '김월펜 과장',
      managerPhone: '010-9876-5432',
      quoteDate: '2026-08-05',
      scheduledDate: '2026-08-08',
      completedDate: '2026-08-08',
      constructionDetails: '호텔 로비 오션뷰 테마 일러스트 월프린팅 시공',
      wallMaterial: '포세린 타일 및 매끄러운 대리석 벽면',
      printWidthMm: 5000,
      printHeightMm: 3000,
      printAreaM2: 15.0,
      useWhiteInk: true,
      specialNotes: '타일 전용 특수 프라이머 2회 도포 후 시공. 광택 유지 코팅 마감.',
      supplyAmount: 3800000,
      taxAmount: 380000,
      totalAmount: 4180000,
      depositAmount: 2090000,
      balanceAmount: 2090000,
      depositPaid: true,
      balancePaid: true,
      depositDueDate: '2026-08-06',
      paymentMemo: '전액 정산 완료 (계약금+잔금 4,180,000원 입금 확인).',
      status: '정산 완료',
      paymentStatus: '정산 완료',
      internalMemo: '시공 퀄리티 극찬받음. 추후 2호점 객실 복도 추가 발주 협의 예정.',
      files: [],
      publicSettings: {
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
      },
      isShareActive: false,
      shareToken: p3Token,
      createdAt: '2026-08-05T11:00:00.000Z',
      updatedAt: '2026-08-09T18:00:00.000Z',
    },
  ];
}

export class ProjectDatabase {
  private static readAll(): ProjectItem[] {
    try {
      if (!fs.existsSync(DB_FILE)) {
        const initial = getInitialProjects();
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
        return initial;
      }
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading DB_FILE, resetting to seed:', err);
      const initial = getInitialProjects();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
  }

  private static writeAll(projects: ProjectItem[]): void {
    fs.writeFileSync(DB_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  }

  public static list(search?: string, status?: string, paymentStatus?: string): ProjectItem[] {
    let items = this.readAll();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (p) =>
          (p.projectName || '').toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.address || '').toLowerCase().includes(q) ||
          (p.managerName || '').toLowerCase().includes(q)
      );
    }

    if (status && status !== '전체') {
      items = items.filter((p) => p.status === status);
    }

    if (paymentStatus && paymentStatus !== '전체') {
      items = items.filter((p) => p.paymentStatus === paymentStatus);
    }

    // Sort by updatedAt descending
    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public static getById(id: string): ProjectItem | null {
    const items = this.readAll();
    return items.find((p) => p.id === id) || null;
  }

  public static getByShareToken(token: string): ProjectItem | null {
    const items = this.readAll();
    return items.find((p) => p.shareToken === token) || null;
  }

  public static create(item: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt' | 'shareToken'>): ProjectItem {
    const items = this.readAll();
    const now = new Date().toISOString();
    const newProject: ProjectItem = {
      ...item,
      id: 'proj-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      shareToken: generateToken(),
      createdAt: now,
      updatedAt: now,
    };
    items.unshift(newProject);
    this.writeAll(items);
    return newProject;
  }

  public static update(id: string, updates: Partial<ProjectItem>): ProjectItem | null {
    const items = this.readAll();
    const index = items.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const current = items[index];
    const updated: ProjectItem = {
      ...current,
      ...updates,
      id: current.id, // Immutable ID
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    this.writeAll(items);
    return updated;
  }

  public static delete(id: string): boolean {
    const items = this.readAll();
    const target = items.find((p) => p.id === id);
    if (!target) return false;

    // Delete associated physical files
    if (target.files && target.files.length > 0) {
      for (const file of target.files) {
        const filePath = path.join(UPLOADS_DIR, file.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error('Failed to unlink file:', filePath, e);
          }
        }
      }
    }

    const filtered = items.filter((p) => p.id !== id);
    this.writeAll(filtered);
    return true;
  }

  public static addFile(projectId: string, file: ProjectFile): ProjectItem | null {
    const project = this.getById(projectId);
    if (!project) return null;

    const files = project.files || [];
    files.push(file);
    return this.update(projectId, { files });
  }

  public static updateFile(projectId: string, fileId: string, updates: Partial<ProjectFile>): ProjectItem | null {
    const project = this.getById(projectId);
    if (!project) return null;

    const files = (project.files || []).map((f) => {
      if (f.id === fileId) {
        return { ...f, ...updates };
      }
      return f;
    });

    return this.update(projectId, { files });
  }

  public static deleteFile(projectId: string, fileId: string): ProjectItem | null {
    const project = this.getById(projectId);
    if (!project) return null;

    const targetFile = (project.files || []).find((f) => f.id === fileId);
    if (targetFile) {
      const filePath = path.join(UPLOADS_DIR, targetFile.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('Error removing file:', filePath, e);
        }
      }
    }

    const files = (project.files || []).filter((f) => f.id !== fileId);
    return this.update(projectId, { files });
  }

  public static regenerateShareToken(id: string): { project: ProjectItem; newToken: string } | null {
    const project = this.getById(id);
    if (!project) return null;

    const newToken = generateToken();
    const updated = this.update(id, { shareToken: newToken, isShareActive: true });
    if (!updated) return null;
    return { project: updated, newToken };
  }

  public static toggleShare(id: string, active?: boolean): ProjectItem | null {
    const project = this.getById(id);
    if (!project) return null;

    const newState = active !== undefined ? active : !project.isShareActive;
    return this.update(id, { isShareActive: newState });
  }

  // Security: Extract strictly sanitized public view. NEVER leak internalMemo or non-public fields.
  public static getSanitizedPublicView(token: string): { error?: string; data?: PublicProjectView } {
    const project = this.getByShareToken(token);
    if (!project) {
      return { error: 'NOT_FOUND' };
    }

    if (!project.isShareActive) {
      return { error: 'SHARE_INACTIVE' };
    }

    const s = project.publicSettings || getDefaultPublicSettings();

    // Only include files marked as public
    const publicFiles = (project.files || [])
      .filter((f) => f.isPublic)
      .map((f) => ({
        id: f.id,
        originalName: f.originalName,
        fileType: f.fileType,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        uploadedAt: f.uploadedAt,
        url: `/api/public/files/${token}/${f.id}/view`,
        downloadUrl: `/api/public/files/${token}/${f.id}/download`,
      }));

    const view: PublicProjectView = {
      shareToken: project.shareToken,
      projectName: s.showProjectName ? project.projectName : undefined,
      customerName: s.showCustomerName ? project.customerName : undefined,
      address: s.showAddress ? project.address : undefined,
      managerName: s.showManagerInfo ? project.managerName : undefined,
      managerPhone: s.showManagerInfo ? project.managerPhone : undefined,
      quoteDate: project.quoteDate || undefined,
      scheduledDate: s.showConstructionDate ? project.scheduledDate || undefined : undefined,
      completedDate: s.showConstructionDate ? project.completedDate || undefined : undefined,
      constructionDetails: s.showConstructionDetails ? project.constructionDetails : undefined,
      wallMaterial: s.showConstructionDetails ? project.wallMaterial : undefined,
      printWidthMm: s.showPrintSizeArea ? project.printWidthMm : undefined,
      printHeightMm: s.showPrintSizeArea ? project.printHeightMm : undefined,
      printAreaM2: s.showPrintSizeArea ? project.printAreaM2 : undefined,
      useWhiteInk: s.showConstructionDetails ? project.useWhiteInk : undefined,
      specialNotes: s.showSpecialNotes ? project.specialNotes : undefined,
      totalAmount: s.showTotalAmount ? project.totalAmount : undefined,
      depositAmount: s.showDeposit ? project.depositAmount : undefined,
      balanceAmount: s.showBalance ? project.balanceAmount : undefined,
      paymentStatus: s.showPaymentStatus ? project.paymentStatus : undefined,
      status: project.status,
      files: publicFiles,
      updatedAt: project.updatedAt,
    };

    return { data: view };
  }
}

export { UPLOADS_DIR };
