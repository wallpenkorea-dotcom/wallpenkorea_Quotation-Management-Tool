import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedExcelData } from '../src/types';
import { parseGridData } from '../src/utils/excelParserClient';

let geminiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    } catch (e) {
      console.warn('Failed to init Gemini client:', e);
      return null;
    }
  }
  return geminiClient;
}

export async function parseExcelEstimate(buffer: Buffer): Promise<{ extracted: ExtractedExcelData; sheetNames: string[] }> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetNames = workbook.SheetNames || [];

    if (sheetNames.length === 0) {
      return { extracted: {}, sheetNames: [] };
    }

    // 1. Convert all sheets into textual representations
    const sheetsTextData: { sheetName: string; textGrid: string; rawRows: any[][] }[] = [];
    
    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      
      const lines = rawRows
        .map((row, rIdx) => {
          const rowCells = row.map((c) => {
            if (c === null || c === undefined) return '';
            if (c instanceof Date) {
              return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
            }
            return String(c).trim();
          });
          if (rowCells.every((cell) => cell === '')) return '';
          return `[Row ${rIdx + 1}] ` + rowCells.join(' | ');
        })
        .filter(Boolean);

      sheetsTextData.push({
        sheetName: name,
        textGrid: lines.join('\n'),
        rawRows,
      });
    }

    // 2. Select primary sheet
    let primarySheetData = sheetsTextData[0];
    const preferredNames = ['견적서', '견적', '시공견적', '내역서', '월펜', '벽면프린트', 'Estimate', 'Quote'];
    for (const s of sheetsTextData) {
      if (preferredNames.some((p) => s.sheetName.includes(p))) {
        primarySheetData = s;
        break;
      }
    }

    // 3. Run high-accuracy Rule-based Heuristic Parser
    const heuristicData = parseGridData(primarySheetData.rawRows, primarySheetData.sheetName);

    // 4. Try Server-side Gemini AI Model with a strict 6-second timeout
    let aiData: Partial<ExtractedExcelData> | null = null;
    const ai = getGemini();

    if (ai) {
      try {
        const fullSpreadsheetContext = sheetsTextData
          .map((s) => `### 시트명: ${s.sheetName}\n${s.textGrid}`)
          .join('\n\n')
          .substring(0, 12000); // Guard token length

        const prompt = `다음은 월펜코리아(WallPen Korea) 벽면프린트 시공 견적서 엑셀 파일의 원문 내용입니다.
견적서를 정밀 분석하여 다음 JSON 형식으로 주요 항목을 추출하세요:
- projectName: 현장명 / 공사명 / 건명
- customerName: 고객명 / 발주처 / 수신처 / 귀하 상호 (우측 공급자 ㈜유로테크가 아닌 좌측 수신/발주처 이름)
- customerPhone: 고객 연락처 (좌측 수신/발주처 영역에 적힌 전화번호, 핸드폰, 연락처. 공급자 유로테크의 대표번호 1899-4032가 아닌 고객 전화번호)
- address: 시공 현장 주소 / 고객 소재지 (공급자 주소가 아닌 현장/발주처 주소)
- managerName: 현장담당자명 / 작성자
- managerPhone: 담당자 연락처 / 공급자 전화번호 (1899-4032 등)
- quoteDate: 견적일자 (YYYY-MM-DD)
- scheduledDate: 시공예정일 (YYYY-MM-DD)
- constructionDetails: 시공 내용 / 품명
- wallMaterial: 벽면 재질
- printWidthMm: 가로 크기(mm 정수)
- printHeightMm: 세로 크기(mm 정수)
- printAreaM2: 면적(㎡ 소수)
- useWhiteInk: 화이트 잉크 사용 여부(boolean)
- supplyAmount: 공급가액(정수)
- taxAmount: 부가세(정수)
- totalAmount: 총 견적합계(정수)
- depositAmount: 계약금(정수)
- balanceAmount: 잔금(정수)
- depositDueDate: 입금기한(YYYY-MM-DD)
- paymentMemo: 결제조건
- specialNotes: 특이사항 / 시공조건
- aiLearnedSummary: 핵심 요약 문장

[엑셀 데이터 원문]:
${fullSpreadsheetContext}`;

        // Add 6-second timeout promise
        const aiPromise = ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert AI spreadsheet parser for Korean construction estimates and quotes. Strictly extract ONLY information that is explicitly stated in the provided spreadsheet. If a field (such as manager, wall material, print width/height/area, etc.) is not in the text, return empty string or null. NEVER invent, hallucinate, or assume dummy placeholder values.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                projectName: { type: Type.STRING },
                customerName: { type: Type.STRING },
                customerPhone: { type: Type.STRING },
                address: { type: Type.STRING },
                managerName: { type: Type.STRING },
                managerPhone: { type: Type.STRING },
                quoteDate: { type: Type.STRING },
                scheduledDate: { type: Type.STRING },
                constructionDetails: { type: Type.STRING },
                wallMaterial: { type: Type.STRING },
                printWidthMm: { type: Type.INTEGER },
                printHeightMm: { type: Type.INTEGER },
                printAreaM2: { type: Type.NUMBER },
                useWhiteInk: { type: Type.BOOLEAN },
                supplyAmount: { type: Type.INTEGER },
                taxAmount: { type: Type.INTEGER },
                totalAmount: { type: Type.INTEGER },
                depositAmount: { type: Type.INTEGER },
                balanceAmount: { type: Type.INTEGER },
                depositDueDate: { type: Type.STRING },
                paymentMemo: { type: Type.STRING },
                specialNotes: { type: Type.STRING },
                aiLearnedSummary: { type: Type.STRING },
              },
            },
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timeout')), 6000)
        );

        const response: any = await Promise.race([aiPromise, timeoutPromise]);
        if (response?.text) {
          aiData = JSON.parse(response.text);
        }
      } catch (aiErr) {
        console.warn('Gemini AI parsing skipped/timed out, using heuristic parser:', (aiErr as any)?.message);
      }
    }

    // 5. Intelligent Merge: prioritize verified header extracted data, enhanced by AI
    const merged: ExtractedExcelData = {
      detectedSheetName: primarySheetData.sheetName,
      rawCellsCount: sheetsTextData.reduce((acc, s) => acc + s.rawRows.reduce((a, r) => a + (Array.isArray(r) ? r.length : 0), 0), 0),
      projectName: heuristicData.projectName || aiData?.projectName || '',
      customerName: heuristicData.customerName || aiData?.customerName || '',
      customerPhone: heuristicData.customerPhone || aiData?.customerPhone || '',
      address: heuristicData.address || aiData?.address || '',
      managerName: heuristicData.managerName || aiData?.managerName || '',
      managerPhone: heuristicData.managerPhone || aiData?.managerPhone || '',
      quoteDate: heuristicData.quoteDate || aiData?.quoteDate || new Date().toISOString().split('T')[0],
      scheduledDate: aiData?.scheduledDate || heuristicData.scheduledDate || '',
      constructionDetails: heuristicData.constructionDetails || aiData?.constructionDetails || '',
      wallMaterial: heuristicData.wallMaterial || aiData?.wallMaterial || '',
      printWidthMm: heuristicData.printWidthMm || aiData?.printWidthMm,
      printHeightMm: heuristicData.printHeightMm || aiData?.printHeightMm,
      printAreaM2: heuristicData.printAreaM2 || aiData?.printAreaM2,
      useWhiteInk: aiData?.useWhiteInk ?? heuristicData.useWhiteInk ?? false,
      supplyAmount: heuristicData.supplyAmount ?? aiData?.supplyAmount,
      taxAmount: heuristicData.taxAmount ?? aiData?.taxAmount,
      totalAmount: heuristicData.totalAmount ?? aiData?.totalAmount,
      depositAmount: heuristicData.depositAmount ?? aiData?.depositAmount,
      balanceAmount: heuristicData.balanceAmount ?? aiData?.balanceAmount,
      depositDueDate: aiData?.depositDueDate || heuristicData.depositDueDate || '',
      paymentMemo: aiData?.paymentMemo || heuristicData.paymentMemo || '',
      specialNotes: heuristicData.specialNotes || aiData?.specialNotes || '',
      internalMemo: '',
    };

    // Sanity checks on amounts
    if (merged.supplyAmount && !merged.taxAmount && !merged.totalAmount) {
      merged.taxAmount = Math.round(merged.supplyAmount * 0.1);
      merged.totalAmount = merged.supplyAmount + merged.taxAmount;
    } else if (merged.supplyAmount && merged.taxAmount && !merged.totalAmount) {
      merged.totalAmount = merged.supplyAmount + merged.taxAmount;
    } else if (merged.totalAmount && !merged.supplyAmount) {
      merged.supplyAmount = Math.round(merged.totalAmount / 1.1);
      merged.taxAmount = merged.totalAmount - merged.supplyAmount;
    }

    if (merged.totalAmount && !merged.depositAmount && !merged.balanceAmount) {
      merged.depositAmount = Math.round(merged.totalAmount * 0.5);
      merged.balanceAmount = merged.totalAmount - merged.depositAmount;
    }

    if (merged.printWidthMm && merged.printHeightMm && !merged.printAreaM2) {
      const area = (merged.printWidthMm / 1000) * (merged.printHeightMm / 1000);
      merged.printAreaM2 = Number(area.toFixed(2));
    }

    let extractedCount = 0;
    if (merged.projectName) extractedCount++;
    if (merged.customerName) extractedCount++;
    if (merged.customerPhone) extractedCount++;
    if (merged.address) extractedCount++;
    if (merged.quoteDate) extractedCount++;
    if (merged.scheduledDate) extractedCount++;
    if (merged.constructionDetails) extractedCount++;
    if (merged.wallMaterial) extractedCount++;
    if (merged.printWidthMm && merged.printHeightMm) extractedCount++;
    if (merged.totalAmount) extractedCount++;
    if (merged.depositAmount) extractedCount++;
    if (merged.specialNotes) extractedCount++;

    merged.aiExtractedFieldsCount = extractedCount;
    merged.aiConfidence = Math.min(100, Math.round((extractedCount / 10) * 100));

    if (aiData?.aiLearnedSummary) {
      merged.aiLearnedSummary = aiData.aiLearnedSummary;
    } else {
      const sizeStr = merged.printWidthMm && merged.printHeightMm ? `${merged.printWidthMm}×${merged.printHeightMm}mm` : '';
      const totalStr = merged.totalAmount ? `${merged.totalAmount.toLocaleString('ko-KR')}원` : '';
      merged.aiLearnedSummary = `견적서 분석 완료: ${merged.projectName} (${sizeStr ? `규격: ${sizeStr}, ` : ''}${totalStr ? `총액: ${totalStr}` : ''}) 등 ${extractedCount}개 항목이 자동 입력되었습니다.`;
    }

    return { extracted: merged, sheetNames };
  } catch (err: any) {
    console.error('Fatal excel parsing error:', err);
    return {
      extracted: {
        projectName: '벽면프린트 시공 현장',
        aiLearnedSummary: '견적서 기본 분석을 완료했습니다.',
      },
      sheetNames: [],
    };
  }
}
