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
    if (!val && val !== 0) return undefined;
    if (val instanceof Date && !isNaN(val.getTime())) {
      return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
    }
    if (typeof val === 'number' && val > 30000 && val < 60000) {
      const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        const y = jsDate.getUTCFullYear();
        const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(jsDate.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    const str = String(val).trim();
    // Match 2026.04.26, 2026-04-26, 2026년 4월 26일, 2026/04/26, 2026.04.26(일)
    const match = str.match(/(\d{4})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // Match short year 26.04.26
    const matchShort = str.match(/(\d{2})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/);
    if (matchShort && parseInt(matchShort[1], 10) >= 20) {
      const y = `20${matchShort[1]}`;
      const m = matchShort[2].padStart(2, '0');
      const d = matchShort[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return undefined;
  };

  const numRows = rawRows.length;

  // 1. Dedicated WallPen Korea Quote Header Parser (Rows 0 to 14, Left Section c < 8)
  for (let r = 0; r < Math.min(15, numRows); r++) {
    const row = rawRows[r] || [];
    for (let c = 0; c < Math.min(8, row.length); c++) {
      const cellText = cleanStr(row[c]);
      if (!cellText) continue;

      // (1) Quote Date: Look for date string like '2026년 04월 22일' or '2026-04-22' in left upper quadrant
      if (!extracted.quoteDate) {
        const dateMatch = cellText.match(/(\d{4})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/);
        if (dateMatch) {
          extracted.quoteDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        }
      }

      // (2) Customer Name: Check if row contains '귀하' or customer name cell
      if (!extracted.customerName && (cellText.includes('귀하') || cellText === '귀하')) {
        for (let prevC = 0; prevC < c; prevC++) {
          const prevVal = cleanStr(row[prevC]);
          if (prevVal && !prevVal.includes('공급자') && !prevVal.includes('견적서') && !prevVal.includes('유로테크')) {
            extracted.customerName = prevVal;
            break;
          }
        }
        if (!extracted.customerName) {
          const stripped = cellText.replace(/귀하/g, '').trim();
          if (stripped && !stripped.includes('공급자') && !stripped.includes('유로테크')) {
            extracted.customerName = stripped;
          }
        }
      }

      // (3) Contact string: e.g. "담당자: 심민근 / 전화번호: 010-2785-0163" or "전화번호: 010-..."
      if (cellText.includes('담당자') || cellText.includes('전화번호') || cellText.includes('연락처') || cellText.includes('TEL') || cellText.includes('H.P')) {
        const phoneMatch = cellText.match(/(?:전화번호|연락처|TEL|HP|H\.P|핸드폰|휴대폰)?\s*[:：]?\s*(01[016789][-\s]?\d{3,4}[-\s]?\d{4}|\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/i);
        if (phoneMatch && !extracted.customerPhone) {
          extracted.customerPhone = phoneMatch[1].replace(/\s+/g, '-');
        }

        const mgrMatch = cellText.match(/담당자\s*[:：]?\s*([가-힣a-zA-Z]{2,10})/);
        if (mgrMatch && !extracted.managerName && !mgrMatch[1].includes('유로테크')) {
          extracted.managerName = mgrMatch[1].trim();
        }
      }

      // (4) Customer Address: Check for address in left quadrant (Rows 6-11)
      if (!extracted.address && r >= 5 && r <= 11 && c < 5) {
        if (
          /([가-힣]+(?:시|도|구|군|로|길|동|읍|면)\s+[가-힣0-9\-]+)/.test(cellText) &&
          !cellText.includes('SK테크노파크') &&
          !cellText.includes('광명시 하안로') &&
          !cellText.includes('유로테크')
        ) {
          extracted.address = cellText;
        }
      }
    }
  }

  // 2. Table scan for items, dimensions, materials, and totals
  let headerRowIndex = -1;
  const colIndex: { [key: string]: number } = {};
  for (let r = 0; r < numRows; r++) {
    const row = (rawRows[r] || []).map(cleanStr);
    if (row.some((c) => c === 'No' || c === '내용' || c === '품명' || c === '항목')) {
      headerRowIndex = r;
      row.forEach((colName, idx) => {
        if (colName === '내용' || colName === '품명' || colName === '항목') colIndex.desc = idx;
        if (colName === '재질' || colName === '벽면재질') colIndex.material = idx;
        if (colName.includes('가로')) colIndex.width = idx;
        if (colName.includes('세로')) colIndex.height = idx;
        if (colName.includes('총헤베') || colName === '헤베' || colName.includes('면적')) colIndex.area = idx;
        if (colName.includes('공급가액+세액') || colName.includes('합계') || colName.includes('총금액')) colIndex.total = idx;
        if (colName === '공급가액' || colName === '공급가') colIndex.supply = idx;
      });
      break;
    }
  }

  const items: Array<{ desc: string; material?: string; width?: number; height?: number; area?: number }> = [];
  if (headerRowIndex !== -1) {
    for (let r = headerRowIndex + 1; r < numRows; r++) {
      const row = rawRows[r] || [];
      const firstCol = cleanStr(row[colIndex.desc !== undefined ? colIndex.desc : 1] || row[1] || row[2]);
      const noCol = cleanStr(row[1] || row[0]);

      if (firstCol.includes('합계') || noCol.includes('합계') || firstCol.includes('특이사항') || noCol.includes('특이사항')) {
        if ((firstCol.includes('합계') || noCol.includes('합계')) && !extracted.totalAmount) {
          for (let c = 0; c < row.length; c++) {
            const num = parseNumber(row[c]);
            if (num && num > 10000) {
              extracted.totalAmount = num;
              break;
            }
          }
        }
        break;
      }

      if (firstCol && !/^\d+$/.test(firstCol)) {
        items.push({
          desc: firstCol,
          material: colIndex.material !== undefined ? cleanStr(row[colIndex.material]) : undefined,
          width: colIndex.width !== undefined ? parseDecimal(row[colIndex.width]) : undefined,
          height: colIndex.height !== undefined ? parseDecimal(row[colIndex.height]) : undefined,
          area: colIndex.area !== undefined ? parseDecimal(row[colIndex.area]) : undefined,
        });
      }
    }
  }

  if (items.length > 0) {
    if (!extracted.constructionDetails) {
      extracted.constructionDetails = items.slice(0, 3).map((it) => it.desc).join(', ') + (items.length > 3 ? ` 외 ${items.length - 3}건` : '');
    }
    const matItem = items.find((it) => it.material);
    if (matItem && matItem.material && !extracted.wallMaterial) extracted.wallMaterial = matItem.material;

    const sizeItem = items.find((it) => it.width && it.height);
    if (sizeItem) {
      if (!extracted.printWidthMm && sizeItem.width) {
        extracted.printWidthMm = sizeItem.width < 100 ? Math.round(sizeItem.width * 1000) : Math.round(sizeItem.width);
      }
      if (!extracted.printHeightMm && sizeItem.height) {
        extracted.printHeightMm = sizeItem.height < 100 ? Math.round(sizeItem.height * 1000) : Math.round(sizeItem.height);
      }
      if (!extracted.printAreaM2 && sizeItem.area) {
        extracted.printAreaM2 = sizeItem.area;
      }
    }
  }

  // 3. Special notes scan (rows under 특이사항)
  const notes: string[] = [];
  let inNotes = false;
  for (let r = 0; r < numRows; r++) {
    const row = rawRows[r] || [];
    const firstNonEmpty = row.find((c) => cleanStr(c) !== '');
    const txt = cleanStr(firstNonEmpty);
    if (
      txt.includes('특이사항') ||
      txt.includes('시공조건') ||
      txt.includes('작업조건') ||
      txt.includes('안내사항') ||
      txt.includes('참고사항') ||
      txt.includes('전달사항')
    ) {
      inNotes = true;
      continue;
    }
    if (inNotes) {
      if (txt.startsWith('·') || txt.includes('최소 작업') || txt.includes('입금계좌') || r > headerRowIndex + 30) {
        break;
      }
      if (txt) {
        notes.push(txt);

        // Extract scheduled / work date from note line (e.g., "1. 작업 진행 날짜: 2026.04.26(일)", "시공일자: 2026-05-10")
        if (!extracted.scheduledDate) {
          const dateInNoteMatch = txt.match(
            /(?:작업\s*진행\s*날짜|작업\s*진행일|작업\s*날짜|작업일자|작업일|시공\s*예정일|시공\s*예정|시공\s*날짜|시공일자|시공일|작업\s*일정|시공\s*일정|진행\s*일자|진행\s*날짜|공사\s*일자|공사일|투입일|설치\s*일자|설치일|일정)\s*[:：]?\s*(\d{4}[.\-\/년\s]+\d{1,2}[.\-\/월\s]+\d{1,2}(?:\s*\([가-힣]\))?)/
          );
          if (dateInNoteMatch) {
            const parsed = parseDateStr(dateInNoteMatch[1]);
            if (parsed) extracted.scheduledDate = parsed;
          } else if (
            txt.includes('작업') ||
            txt.includes('진행') ||
            txt.includes('시공') ||
            txt.includes('일정') ||
            txt.includes('날짜') ||
            txt.includes('일자')
          ) {
            const genericDateMatch = txt.match(/(\d{4}[.\-\/년\s]+\d{1,2}[.\-\/월\s]+\d{1,2})/);
            if (genericDateMatch) {
              const parsed = parseDateStr(genericDateMatch[0]);
              if (parsed && parsed !== extracted.quoteDate) {
                extracted.scheduledDate = parsed;
              }
            }
          }
        }

        const addrInNote = txt.match(/(?:시공\s*주소|현장\s*주소|설치\s*주소|배송\s*주소)\s*[:：]?\s*([가-힣0-9\s\-]+)/);
        if (addrInNote && addrInNote[1].length > 5) {
          extracted.address = addrInNote[1].trim();
        }
      }
    }
  }
  if (notes.length > 0 && !extracted.specialNotes) {
    extracted.specialNotes = notes.join('\n');
  }

  // 4. Generic Grid Iteration for labeled spreadsheets
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

      // 2. 고객명 / 수신 / 발주처 (Usually in columns < 5)
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
          cellText.startsWith('고객명:') ||
          cellText.startsWith('발주처:'))
      ) {
        if (cellText !== '상호' || c < 5) {
          const rawName = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
          if (rawName && !rawName.includes('유로테크')) {
            extracted.customerName = rawName.replace(/귀하|대표|담당자/g, '').trim();
          }
        }
      }

      // 3. 고객 연락처 (고객 전화번호, 핸드폰, TEL 등 - c < 5)
      const isCustomerPhoneKey =
        cellText === '고객 연락처' ||
        cellText === '고객연락처' ||
        cellText === '고객 전화' ||
        cellText === '고객전화' ||
        cellText === '발주처 연락처' ||
        cellText === '발주처 전화' ||
        cellText === '수신처 연락처' ||
        cellText === '수신 연락처' ||
        cellText === '고객 H.P' ||
        cellText === '고객 TEL' ||
        cellText.startsWith('고객연락처:') ||
        cellText.startsWith('고객 연락처:') ||
        cellText.startsWith('발주처 연락처:') ||
        ((cellText === '전화번호' ||
          cellText === '전화' ||
          cellText === '연락처' ||
          cellText === '핸드폰' ||
          cellText === '휴대폰' ||
          cellText === 'H.P' ||
          cellText === 'HP' ||
          cellText === 'TEL' ||
          cellText === 'Tel' ||
          cellText === 'Mobile' ||
          cellText.startsWith('전화번호:') ||
          cellText.startsWith('TEL:')) &&
          c < 5);

      if (!extracted.customerPhone && isCustomerPhoneKey) {
        const rawPhone = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
        if (rawPhone && /[0-9]/.test(rawPhone)) {
          const cleanPhone = rawPhone.replace(/[^\d-+()~.\s]/g, '').trim();
          if (cleanPhone.replace(/\D/g, '').length >= 7) {
            extracted.customerPhone = cleanPhone;
          }
        }
      }

      // 4. 담당자 / 작성자
      if (
        !extracted.managerName &&
        !cellText.includes('연락처') &&
        !cellText.includes('전화') &&
        !cellText.includes('H.P') &&
        (cellText === '작성자' ||
          cellText === '현장담당' ||
          cellText === '담당자' ||
          cellText === '영업담당' ||
          cellText === '견적담당' ||
          cellText === '대표자')
      ) {
        const name = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
        if (name && !/[0-9]{4}-[0-9]{2}/.test(name) && !name.includes('㈜')) {
          extracted.managerName = name.replace(/\(인\)|인|대표/g, '').trim();
        }
      }

      // 5. 담당자 / 공급자 연락처 (c >= 4)
      const isManagerPhoneKey =
        cellText === '담당자 연락처' ||
        cellText === '작성자 연락처' ||
        cellText === '담당자연락처' ||
        cellText === '담당자 H.P' ||
        cellText === '회사 전화' ||
        cellText === '대표번호' ||
        ((cellText === '전화번호' ||
          cellText === '전화' ||
          cellText === '연락처' ||
          cellText === 'TEL' ||
          cellText === 'Tel' ||
          cellText === 'H.P') &&
          c >= 5);

      if (!extracted.managerPhone && isManagerPhoneKey) {
        const phone = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
        if (phone && /[0-9]/.test(phone)) {
          const cleanPhone = phone.replace(/[^\d-+()~.\s]/g, '').trim();
          if (cleanPhone.replace(/\D/g, '').length >= 7) {
            extracted.managerPhone = cleanPhone;
          }
        }
      }

      // 6. 현장 주소 / 고객 소재지 (c < 5 prefer customer address)
      if (
        !extracted.address &&
        (cellText === '현장주소' ||
          cellText === '현장 주소' ||
          cellText === '시공장소' ||
          cellText === '시공위치' ||
          cellText === '설치장소' ||
          cellText === '소재지' ||
          cellText === '주소' ||
          cellText.startsWith('현장주소:') ||
          cellText.startsWith('시공장소:'))
      ) {
        if (cellText !== '소재지' || c < 5) {
          const addr = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightStr;
          if (addr && !addr.includes('SK테크노파크')) {
            extracted.address = addr;
          }
        }
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
      const isScheduledDateKey =
        cellText === '시공예정일' ||
        cellText === '시공 예정일' ||
        cellText === '시공예정' ||
        cellText === '시공 예정' ||
        cellText === '시공일' ||
        cellText === '시공일자' ||
        cellText === '시공 날짜' ||
        cellText === '시공날짜' ||
        cellText === '작업일' ||
        cellText === '작업일자' ||
        cellText === '작업 날짜' ||
        cellText === '작업날짜' ||
        cellText === '작업진행일' ||
        cellText === '작업진행날짜' ||
        cellText === '작업 진행 날짜' ||
        cellText === '작업 진행일' ||
        cellText === '작업일정' ||
        cellText === '작업 일정' ||
        cellText === '시공일정' ||
        cellText === '시공 일정' ||
        cellText === '설치예정일' ||
        cellText === '설치예정' ||
        cellText === '설치일' ||
        cellText === '설치일자' ||
        cellText === '작업예정일' ||
        cellText === '작업예정' ||
        cellText === '공사예정일' ||
        cellText === '공사일자' ||
        cellText === '공사일' ||
        cellText === '투입일' ||
        cellText === '투입예정일' ||
        cellText === '납기일' ||
        cellText.startsWith('시공예정일:') ||
        cellText.startsWith('시공일:') ||
        cellText.startsWith('작업일:') ||
        cellText.startsWith('작업일자:') ||
        cellText.startsWith('작업 진행 날짜:') ||
        cellText.startsWith('작업진행날짜:');

      if (!extracted.scheduledDate && isScheduledDateKey) {
        const rawDate = cellText.includes(':') ? cellText.split(':')[1]?.trim() : rightVal;
        const d = parseDateStr(rawDate) || parseDateStr(cellText);
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

  if (
    !extracted.projectName ||
    extracted.projectName === '최종 견적서' ||
    extracted.projectName === '견적서' ||
    extracted.projectName === '새 현장' ||
    extracted.projectName === '월펜코리아 견적서'
  ) {
    if (extracted.customerName) {
      extracted.projectName = `${extracted.customerName} 벽면프린팅 시공`;
    } else if (fileName && !fileName.includes('최종 견적서') && !fileName.includes('견적서')) {
      extracted.projectName = fileName.replace(/\.[^/.]+$/, '');
    } else {
      extracted.projectName = fileName ? fileName.replace(/\.[^/.]+$/, '') : '새 벽면프린팅 현장';
    }
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
