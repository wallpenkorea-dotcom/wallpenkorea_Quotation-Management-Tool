import * as XLSX from 'xlsx';
import { ExtractedExcelData } from '../types';

export function parseExcelClientSide(arrayBuffer: ArrayBuffer, fileName?: string): { extracted: ExtractedExcelData; sheetNames: string[] } {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames || [];

    if (sheetNames.length === 0) {
      return {
        extracted: {
          projectName: fileName ? fileName.replace(/\.[^/.]+$/, '') : '새 현장',
        },
        sheetNames: [],
      };
    }

    // Find primary sheet
    let targetSheetName = sheetNames[0];
    const preferredSheetNames = ['견적서', '견적', '시공견적', '내역서', '월펜', '벽면프린트', 'Estimate', 'Quote'];
    for (const name of sheetNames) {
      if (preferredSheetNames.some((p) => name.includes(p))) {
        targetSheetName = name;
        break;
      }
    }

    const sheet = workbook.Sheets[targetSheetName] || workbook.Sheets[sheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    const extracted = parseGridData(rawRows, targetSheetName, fileName);
    return { extracted, sheetNames };
  } catch (err) {
    console.error('Client Excel parse error:', err);
    return {
      extracted: {
        projectName: fileName ? fileName.replace(/\.[^/.]+$/, '') : '새 현장',
      },
      sheetNames: [],
    };
  }
}

export function parseGridData(rawRows: any[][], sheetName: string, fileName?: string): ExtractedExcelData {
  const extracted: ExtractedExcelData = {
    detectedSheetName: sheetName,
  };

  const cleanStr = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val.trim();
    if (val instanceof Date) {
      return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
    }
    return String(val).trim();
  };

  const parseNumber = (val: any): number | undefined => {
    if (val === null || val === undefined || val === '') return undefined;
    if (typeof val === 'number' && !isNaN(val)) return Math.round(val);
    const str = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? undefined : Math.round(num);
  };

  const parseDecimal = (val: any): number | undefined => {
    if (val === null || val === undefined || val === '') return undefined;
    if (typeof val === 'number' && !isNaN(val)) return Number(val.toFixed(2));
    const str = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? undefined : Number(num.toFixed(2));
  };

  const parseDateStr = (val: any): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) {
      return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
    }
    const str = String(val).trim();
    const match = str.match(/(\d{4})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return undefined;
  };

  const numRows = rawRows.length;

  for (let r = 0; r < numRows; r++) {
    const row = rawRows[r] || [];
    const numCols = row.length;

    for (let c = 0; c < numCols; c++) {
      const cellText = cleanStr(row[c]);
      if (!cellText) continue;

      // Helper to find the immediate right non-empty cell in the same row
      const getRightVal = (): any => {
        for (let nextC = c + 1; nextC < numCols; nextC++) {
          const v = row[nextC];
          if (v !== undefined && v !== '' && v !== null) {
            const s = cleanStr(v);
            if (s === ':' || s === '-' || s === '▶' || s === '▷') continue;
            return v;
          }
        }
        return '';
      };

      const rightVal = getRightVal();
      const rightStr = cleanStr(rightVal);

      // 1. 현장명 / 공사명
      if (
        !extracted.projectName &&
        (cellText === '현장명' ||
          cellText === '공사명' ||
          cellText === '프로젝트명' ||
          cellText === '건명' ||
          cellText === '건 명' ||
          cellText.startsWith('현장명:') ||
          cellText.startsWith('공사명:'))
      ) {
        if (cellText.includes(':') && cellText.split(':')[1]?.trim()) {
          extracted.projectName = cellText.split(':')[1].trim();
        } else if (rightStr) {
          extracted.projectName = rightStr;
        }
      }

      // 2. 고객명 / 수신 / 발주처
      if (
        !extracted.customerName &&
        (cellText === '수신' ||
          cellText === '수신(고객명)' ||
          cellText === '고객명' ||
          cellText === '발주처' ||
          cellText === '상호' ||
          cellText === '업체명' ||
          cellText === '수신처' ||
          cellText.startsWith('수신:') ||
          cellText.startsWith('고객명:'))
      ) {
        const rawName = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
        if (rawName) {
          extracted.customerName = rawName.replace(/귀하|대표|담당자/g, '').trim();
        }
      }

      // 3. 고객 연락처
      if (
        !extracted.customerPhone &&
        (cellText === '고객 연락처' ||
          cellText === '고객연락처' ||
          cellText === '고객 전화' ||
          cellText === '발주처 연락처' ||
          (cellText === '연락처' && c < 2))
      ) {
        const phone = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
        if (phone && /[0-9-]/.test(phone)) {
          extracted.customerPhone = phone;
        }
      }

      // 4. 담당자 / 작성자 (Avoid matching '담당자 연락처')
      if (
        !extracted.managerName &&
        !cellText.includes('연락처') &&
        !cellText.includes('전화') &&
        !cellText.includes('H.P') &&
        (cellText === '작성자' ||
          cellText === '현장담당' ||
          cellText === '담당자' ||
          cellText === '영업담당' ||
          cellText === '견적담당')
      ) {
        const name = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
        if (name && !/[0-9]{4}-[0-9]{2}/.test(name)) {
          extracted.managerName = name;
        }
      }

      // 5. 담당자 연락처
      if (
        !extracted.managerPhone &&
        (cellText === '담당자 연락처' ||
          cellText === '작성자 연락처' ||
          cellText === '담당자연락처' ||
          cellText === '담당자 H.P' ||
          (cellText === '연락처' && c >= 2))
      ) {
        const phone = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
        if (phone && /[0-9-]/.test(phone)) {
          extracted.managerPhone = phone;
        }
      }

      // 6. 현장 주소
      if (
        !extracted.address &&
        (cellText === '현장주소' ||
          cellText === '현장 주소' ||
          cellText === '시공장소' ||
          cellText === '시공위치' ||
          cellText === '설치장소' ||
          cellText === '소재지' ||
          cellText === '주소' ||
          cellText.startsWith('현장주소:'))
      ) {
        const addr = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
        if (addr) extracted.address = addr;
      }

      // 7. 견적일자
      if (
        !extracted.quoteDate &&
        (cellText === '견적일자' || cellText === '견적일' || cellText === '작성일자' || cellText === '작성일' || cellText === 'Date')
      ) {
        const d = parseDateStr(rightVal) || parseDateStr(cellText);
        if (d) extracted.quoteDate = d;
      }

      // 8. 시공예정일
      if (
        !extracted.scheduledDate &&
        (cellText === '시공예정일' ||
          cellText === '시공예정' ||
          cellText === '시공일' ||
          cellText === '설치예정일' ||
          cellText === '설치일' ||
          cellText === '작업예정일' ||
          cellText === '납기일')
      ) {
        const d = parseDateStr(rightVal) || parseDateStr(cellText);
        if (d) extracted.scheduledDate = d;
      }

      // 9. 품명 / 시공내용
      if (
        !extracted.constructionDetails &&
        (cellText.includes('품명') ||
          cellText.includes('시공내용') ||
          cellText.includes('작업사양') ||
          cellText.includes('공종명'))
      ) {
        if (rightStr && rightStr.length > 2 && !/^[0-9]+$/.test(rightStr)) {
          extracted.constructionDetails = rightStr;
        }
      }

      // 10. 벽면 재질
      if (
        !extracted.wallMaterial &&
        (cellText === '벽면 재질' || cellText === '벽면재질' || cellText === '시공면' || cellText === '바탕면' || cellText === '재질')
      ) {
        if (rightStr && rightStr.length > 1) {
          extracted.wallMaterial = rightStr;
        }
      }

      // 11. 가로 / 세로 / 면적
      if (
        extracted.printWidthMm === undefined &&
        (cellText.includes('출력 가로') ||
          cellText.includes('출력가로') ||
          cellText.includes('가로(mm)') ||
          cellText.includes('가로폭') ||
          cellText === '가로' ||
          cellText === '폭(mm)')
      ) {
        const num = parseNumber(rightVal);
        if (num && num > 10) extracted.printWidthMm = num;
      }

      if (
        extracted.printHeightMm === undefined &&
        (cellText.includes('출력 세로') ||
          cellText.includes('출력세로') ||
          cellText.includes('세로(mm)') ||
          cellText.includes('높이(mm)') ||
          cellText === '세로' ||
          cellText === '높이')
      ) {
        const num = parseNumber(rightVal);
        if (num && num > 10) extracted.printHeightMm = num;
      }

      if (
        extracted.printAreaM2 === undefined &&
        (cellText.includes('출력 면적') ||
          cellText.includes('출력면적') ||
          cellText.includes('면적(㎡)') ||
          cellText === '면적' ||
          cellText.includes('헤베'))
      ) {
        const dec = parseDecimal(rightVal);
        if (dec && dec > 0) extracted.printAreaM2 = dec;
      }

      // 12. 화이트 잉크
      if (
        extracted.useWhiteInk === undefined &&
        (cellText.includes('화이트 잉크') || cellText.includes('화이트잉크') || cellText.includes('백색 잉크') || cellText === '화이트')
      ) {
        if (rightStr.includes('사용') || rightStr.includes('O') || rightStr.includes('Y') || rightStr.includes('필요') || rightStr.includes('true')) {
          extracted.useWhiteInk = true;
        }
      }

      // 13. 합계 금액표 행 처리
      if (cellText === '합계' || cellText === '총 견적금액' || cellText === '총견적금액' || cellText === '합 계') {
        // Look through remaining columns of this summary row
        const rowNumbers: number[] = [];
        for (let colIdx = c + 1; colIdx < numCols; colIdx++) {
          const n = parseNumber(row[colIdx]);
          if (n && n > 1000) rowNumbers.push(n);
        }

        if (rowNumbers.length >= 3) {
          if (!extracted.supplyAmount) extracted.supplyAmount = rowNumbers[0];
          if (!extracted.taxAmount) extracted.taxAmount = rowNumbers[1];
          if (!extracted.totalAmount) extracted.totalAmount = rowNumbers[2];
        } else if (rowNumbers.length === 2) {
          if (!extracted.supplyAmount) extracted.supplyAmount = rowNumbers[0];
          if (!extracted.totalAmount) extracted.totalAmount = rowNumbers[1];
        } else if (rowNumbers.length === 1 && !extracted.totalAmount) {
          extracted.totalAmount = rowNumbers[0];
        }
      }

      // 14. 개별 금액 필드
      if (extracted.supplyAmount === undefined && (cellText === '공급가액' || cellText === '공급가')) {
        const num = parseNumber(rightVal);
        if (num && num > 1000) extracted.supplyAmount = num;
      }

      if (extracted.taxAmount === undefined && (cellText === '부가세(VAT)' || cellText === '부가세' || cellText === '세액')) {
        const num = parseNumber(rightVal);
        if (num && num >= 0) extracted.taxAmount = num;
      }

      if (extracted.totalAmount === undefined && (cellText === '총 견적금액' || cellText === '총견적금액' || cellText === '총 금액' || cellText === '총금액' || cellText === '견적합계')) {
        const num = parseNumber(rightVal);
        if (num && num > 1000) extracted.totalAmount = num;
      }

      if (extracted.depositAmount === undefined && (cellText.includes('계약금') || cellText.includes('선금') || cellText.includes('착수금'))) {
        const num = parseNumber(rightVal);
        if (num && num > 1000) extracted.depositAmount = num;
      }

      if (extracted.balanceAmount === undefined && (cellText.includes('잔금') || cellText.includes('완료금'))) {
        const num = parseNumber(rightVal);
        if (num && num > 1000) extracted.balanceAmount = num;
      }

      if (!extracted.depositDueDate && (cellText === '입금기한' || cellText === '계약금 입금기한' || cellText === '입금 예정일')) {
        const d = parseDateStr(rightVal);
        if (d) extracted.depositDueDate = d;
      }

      if (!extracted.paymentMemo && (cellText === '입금조건' || cellText === '결제조건' || cellText === '정산조건')) {
        if (rightStr) extracted.paymentMemo = rightStr;
      }

      // 15. 특이사항 / 시공조건 (Not matching header '비고')
      if (
        !extracted.specialNotes &&
        (cellText.includes('특이사항') ||
          cellText.includes('시공조건') ||
          cellText.includes('비고사항') ||
          cellText === '안내사항')
      ) {
        if (rightStr && rightStr.length > 3) {
          extracted.specialNotes = rightStr;
        }
      }
    }
  }

  // Sanity check calculations
  if (extracted.supplyAmount && !extracted.taxAmount && !extracted.totalAmount) {
    extracted.taxAmount = Math.round(extracted.supplyAmount * 0.1);
    extracted.totalAmount = extracted.supplyAmount + extracted.taxAmount;
  } else if (extracted.supplyAmount && extracted.taxAmount && !extracted.totalAmount) {
    extracted.totalAmount = extracted.supplyAmount + extracted.taxAmount;
  } else if (extracted.totalAmount && !extracted.supplyAmount) {
    extracted.supplyAmount = Math.round(extracted.totalAmount / 1.1);
    extracted.taxAmount = extracted.totalAmount - extracted.supplyAmount;
  }

  if (extracted.totalAmount && !extracted.depositAmount && !extracted.balanceAmount) {
    extracted.depositAmount = Math.round(extracted.totalAmount * 0.5);
    extracted.balanceAmount = extracted.totalAmount - extracted.depositAmount;
  } else if (extracted.totalAmount && extracted.depositAmount && !extracted.balanceAmount) {
    extracted.balanceAmount = Math.max(0, extracted.totalAmount - extracted.depositAmount);
  }

  if (extracted.printWidthMm && extracted.printHeightMm && !extracted.printAreaM2) {
    const area = (extracted.printWidthMm / 1000) * (extracted.printHeightMm / 1000);
    extracted.printAreaM2 = Number(area.toFixed(2));
  }

  if (!extracted.projectName) {
    extracted.projectName = fileName ? fileName.replace(/\.[^/.]+$/, '') : '';
  }

  let count = 0;
  if (extracted.projectName) count++;
  if (extracted.customerName) count++;
  if (extracted.customerPhone) count++;
  if (extracted.address) count++;
  if (extracted.quoteDate) count++;
  if (extracted.scheduledDate) count++;
  if (extracted.constructionDetails) count++;
  if (extracted.wallMaterial) count++;
  if (extracted.printWidthMm && extracted.printHeightMm) count++;
  if (extracted.totalAmount || extracted.supplyAmount) count++;
  if (extracted.depositAmount) count++;
  if (extracted.specialNotes) count++;

  extracted.aiExtractedFieldsCount = count;
  extracted.aiConfidence = Math.min(100, Math.round((count / 8) * 100));

  const totalStr = extracted.totalAmount ? `${extracted.totalAmount.toLocaleString('ko-KR')}원` : (extracted.supplyAmount ? `${extracted.supplyAmount.toLocaleString('ko-KR')}원` : '');
  extracted.aiLearnedSummary = `견적서 분석 완료: ${extracted.projectName || '견적서'} (${totalStr ? `총액: ${totalStr}, ` : ''}${count}개 항목 자동 추출)`;

  return extracted;
}
