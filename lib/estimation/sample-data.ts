import type { EstimationSampleData } from "@/lib/estimation/types";

export function createEstimationSampleData(): EstimationSampleData {
  const projectId = "demo-project-01";
  const standardDocumentId = "std-doc-2026";

  return {
    projectId,
    drawingFiles: [
      {
        id: "drawing-a",
        projectId,
        fileName: "A-101_1층 평면도.pdf",
        fileType: "pdf",
        status: "analyzed",
        pageCount: 3,
        uploadedAt: "2026-04-24T09:00:00+09:00"
      },
      {
        id: "drawing-b",
        projectId,
        fileName: "S-201_구조 일람표.pdf",
        fileType: "pdf",
        status: "converted",
        pageCount: 2,
        uploadedAt: "2026-04-24T09:20:00+09:00"
      }
    ],
    drawingPages: [
      {
        id: "page-a1",
        drawingFileId: "drawing-a",
        pageNumber: 1,
        drawingNo: "A-101",
        drawingTitle: "1층 평면도",
        scale: "1/100",
        status: "analyzed"
      },
      {
        id: "page-a2",
        drawingFileId: "drawing-a",
        pageNumber: 2,
        drawingNo: "A-105",
        drawingTitle: "벽체 일람표",
        scale: "1/50",
        status: "analyzed"
      },
      {
        id: "page-b1",
        drawingFileId: "drawing-b",
        pageNumber: 1,
        drawingNo: "S-201",
        drawingTitle: "보/기둥 일람표",
        scale: "NTS",
        status: "converted"
      }
    ],
    extractionCandidates: [
      {
        id: "candidate-wall",
        drawingFileId: "drawing-a",
        drawingPageId: "page-a2",
        extractedType: "wall",
        extractedText: "석고보드벽체 THK100",
        normalizedValue: "석고보드벽체",
        quantity: 128.4,
        unit: "m2",
        sourcePage: 2,
        confidence: 0.93,
        reviewStatus: "accepted",
        drawingNo: "A-105",
        drawingTitle: "벽체 일람표",
        sourceNote: "벽체 일람표 면적 합계 기준"
      },
      {
        id: "candidate-door",
        drawingFileId: "drawing-a",
        drawingPageId: "page-a1",
        extractedType: "door",
        extractedText: "방화문 D-102",
        normalizedValue: "방화문",
        quantity: 6,
        unit: "EA",
        sourcePage: 1,
        confidence: 0.88,
        reviewStatus: "pending",
        drawingNo: "A-101",
        drawingTitle: "1층 평면도",
        sourceNote: "문 기호 집계 기준"
      },
      {
        id: "candidate-rc-beam",
        drawingFileId: "drawing-b",
        drawingPageId: "page-b1",
        extractedType: "structure",
        extractedText: "철근콘크리트 보 B1",
        normalizedValue: "철근콘크리트 보",
        quantity: 18.2,
        unit: "m3",
        sourcePage: 1,
        confidence: 0.91,
        reviewStatus: "accepted",
        drawingNo: "S-201",
        drawingTitle: "보/기둥 일람표",
        sourceNote: "보 일람표 체적 합산"
      },
      {
        id: "candidate-waterproof",
        drawingFileId: "drawing-a",
        drawingPageId: "page-a1",
        extractedType: "finish",
        extractedText: "옥상 우레탄 방수",
        normalizedValue: "우레탄 방수",
        quantity: 95,
        unit: "m2",
        sourcePage: 1,
        confidence: 0.8,
        reviewStatus: "edited",
        drawingNo: "A-101",
        drawingTitle: "1층 평면도",
        sourceNote: "옥상 방수 범위 사용자 보정"
      },
      {
        id: "candidate-paving",
        drawingFileId: "drawing-a",
        drawingPageId: "page-a1",
        extractedType: "civil",
        extractedText: "아스콘포장",
        normalizedValue: "아스콘포장",
        quantity: 240,
        unit: "m2",
        sourcePage: 1,
        confidence: 0.76,
        reviewStatus: "needs_standard_match",
        drawingNo: "A-101",
        drawingTitle: "옥외포장계획도",
        sourceNote: "세부 규격 확인 필요"
      }
    ],
    standardDocuments: [
      {
        id: standardDocumentId,
        title: "2026 건설공사 표준품셈",
        sourceYear: 2026,
        filePath: "standards/2026-standard-estimation.pdf",
        pageCount: 982,
        description: "MVP에서는 필요한 건축/구조 공종 샘플만 사용"
      }
    ],
    standardItems: [
      {
        id: "std-wall",
        standardDocumentId,
        sourceYear: 2026,
        division: "건축",
        chapter: "수장공사",
        section: "경량벽체",
        itemCode: "2026-FIN-014",
        itemName: "석고보드벽체 설치",
        unit: "m2",
        measurementRule: "벽체 중심선 길이 x 높이",
        description: "THK100 경량벽체 기준",
        pageStart: 412,
        pageEnd: 413,
        workCategory: "수장공사"
      },
      {
        id: "std-door",
        standardDocumentId,
        sourceYear: 2026,
        division: "건축",
        chapter: "창호공사",
        section: "문",
        itemCode: "2026-WIN-021",
        itemName: "방화문 설치",
        unit: "EA",
        measurementRule: "문짝 개소 기준",
        description: "방화문/방화셔터 포함",
        pageStart: 488,
        pageEnd: 489,
        workCategory: "창호공사"
      },
      {
        id: "std-rc-beam",
        standardDocumentId,
        sourceYear: 2026,
        division: "구조",
        chapter: "철근콘크리트공사",
        section: "보",
        itemCode: "2026-RC-008",
        itemName: "철근콘크리트 보 타설",
        unit: "m3",
        measurementRule: "도면 체적 기준",
        description: "보 단면 x 길이",
        pageStart: 201,
        pageEnd: 202,
        workCategory: "철근콘크리트공사"
      },
      {
        id: "std-waterproof",
        standardDocumentId,
        sourceYear: 2026,
        division: "건축",
        chapter: "방수공사",
        section: "우레탄",
        itemCode: "2026-WP-011",
        itemName: "우레탄 도막방수",
        unit: "m2",
        measurementRule: "실면적 기준",
        description: "상도/중도/하도 포함",
        pageStart: 530,
        pageEnd: 531,
        workCategory: "방수공사"
      },
      {
        id: "std-steel",
        standardDocumentId,
        sourceYear: 2026,
        division: "구조",
        chapter: "철골공사",
        section: "철골 제작",
        itemCode: "2026-ST-004",
        itemName: "철골보 제작 및 설치",
        unit: "ton",
        measurementRule: "중량 기준",
        description: "기둥/보 제작 포함",
        pageStart: 244,
        pageEnd: 245,
        workCategory: "철골공사"
      },
      {
        id: "std-demolition",
        standardDocumentId,
        sourceYear: 2026,
        division: "해체",
        chapter: "철거공사",
        section: "벽체",
        itemCode: "2026-DEM-002",
        itemName: "내부 벽체 철거",
        unit: "m2",
        measurementRule: "철거 면적 기준",
        description: "폐기물 상차 제외",
        pageStart: 72,
        pageEnd: 73,
        workCategory: "철거공사"
      },
      {
        id: "std-paving",
        standardDocumentId,
        sourceYear: 2026,
        division: "토목",
        chapter: "포장공사",
        section: "아스팔트",
        itemCode: "2026-PV-015",
        itemName: "아스콘포장",
        unit: "m2",
        measurementRule: "포장 면적 기준",
        description: "기층 정리 후 시공",
        pageStart: 615,
        pageEnd: 616,
        workCategory: "포장공사"
      }
    ],
    standardItemKeywords: [
      { id: "kw-1", standardItemId: "std-wall", keyword: "석고보드", drawingTerm: "벽체" },
      { id: "kw-2", standardItemId: "std-door", keyword: "방화문", drawingTerm: "문" },
      {
        id: "kw-3",
        standardItemId: "std-rc-beam",
        keyword: "철근콘크리트",
        drawingTerm: "보"
      },
      {
        id: "kw-4",
        standardItemId: "std-waterproof",
        keyword: "우레탄",
        drawingTerm: "방수"
      },
      { id: "kw-5", standardItemId: "std-paving", keyword: "아스콘", drawingTerm: "포장" }
    ],
    estimateItemMatches: [
      {
        id: "match-wall",
        projectId,
        drawingExtractionId: "candidate-wall",
        standardItemId: "std-wall",
        matchReason: "석고보드/벽체 키워드 일치, 수량 단위 m2 동일",
        confidence: 0.95,
        reviewStatus: "accepted"
      },
      {
        id: "match-door",
        projectId,
        drawingExtractionId: "candidate-door",
        standardItemId: "std-door",
        matchReason: "방화문 기호와 표준품셈 문 항목 매칭",
        confidence: 0.87,
        reviewStatus: "pending"
      },
      {
        id: "match-rc-beam",
        projectId,
        drawingExtractionId: "candidate-rc-beam",
        standardItemId: "std-rc-beam",
        matchReason: "구조 일람표 체적 기준으로 철근콘크리트 보 항목 추천",
        confidence: 0.94,
        reviewStatus: "accepted"
      },
      {
        id: "match-waterproof",
        projectId,
        drawingExtractionId: "candidate-waterproof",
        standardItemId: "std-waterproof",
        matchReason: "옥상 방수 상세 기준으로 사용자 보정 후 승인",
        confidence: 0.82,
        reviewStatus: "accepted"
      },
      {
        id: "match-paving",
        projectId,
        drawingExtractionId: "candidate-paving",
        standardItemId: "std-paving",
        matchReason: "포장 키워드는 일치하나 층두께/기층 정보 부족",
        confidence: 0.61,
        reviewStatus: "needs_standard_match"
      }
    ],
    scheduleForecastItems: [
      {
        id: "schedule-1",
        projectId,
        estimateItemId: "estimate-candidate-rc-beam-std-rc-beam",
        workCategory: "철근콘크리트공사",
        taskName: "보/기둥 배근 검토",
        plannedQuantity: 18.2,
        unit: "m3",
        plannedOrder: 1,
        estimatedDurationDays: 2,
        dependencyNote: "거푸집 검측 후 착수",
        status: "linked"
      },
      {
        id: "schedule-2",
        projectId,
        workCategory: "철골공사",
        taskName: "철골 보 반입 및 조립",
        plannedQuantity: 12,
        unit: "ton",
        plannedOrder: 2,
        estimatedDurationDays: 3,
        dependencyNote: "양중 계획 검토 필요",
        status: "draft"
      },
      {
        id: "schedule-3",
        projectId,
        estimateItemId: "estimate-candidate-wall-std-wall",
        workCategory: "수장공사",
        taskName: "석고보드벽체 프레임 설치",
        plannedQuantity: 128.4,
        unit: "m2",
        plannedOrder: 4,
        estimatedDurationDays: 4,
        dependencyNote: "전기/설비 선행 매립 후 착수",
        status: "linked"
      },
      {
        id: "schedule-4",
        projectId,
        workCategory: "창호공사",
        taskName: "방화문 발주 및 설치",
        plannedQuantity: 6,
        unit: "EA",
        plannedOrder: 5,
        estimatedDurationDays: 2,
        dependencyNote: "문틀 치수 검증 필요",
        status: "review_needed"
      },
      {
        id: "schedule-5",
        projectId,
        estimateItemId: "estimate-candidate-waterproof-std-waterproof",
        workCategory: "방수공사",
        taskName: "옥상 우레탄 방수",
        plannedQuantity: 95,
        unit: "m2",
        plannedOrder: 6,
        estimatedDurationDays: 2,
        dependencyNote: "바탕면 건조 상태 확인",
        status: "linked"
      },
      {
        id: "schedule-6",
        projectId,
        workCategory: "포장공사",
        taskName: "옥외 아스콘포장",
        plannedQuantity: 240,
        unit: "m2",
        plannedOrder: 7,
        estimatedDurationDays: 2,
        dependencyNote: "품셈 매칭 확정 후 수량 검증",
        status: "draft"
      },
      {
        id: "schedule-7",
        projectId,
        workCategory: "철거공사",
        taskName: "내부 벽체 철거 및 폐기물 정리",
        plannedQuantity: 88,
        unit: "m2",
        plannedOrder: 0,
        estimatedDurationDays: 2,
        dependencyNote: "선행 공종, 폐기물 반출 확인",
        status: "review_needed"
      }
    ]
  };
}
