import type {
  DrawingDiscipline,
  DrawingQuantityRoadmapRecord,
  DrawingReferenceRecord,
  DrawingSheetIndexRecord,
  DrawingSheetType,
  PdfTextExtractionResult,
  QuantityReadinessStatus
} from "@/lib/estimation/types";

type KeywordRule<T extends string> = {
  value: T;
  keywords: string[];
};

type ReadinessResult = {
  status: QuantityReadinessStatus;
  reason: string;
};

const drawingNoPattern = /\b([ASME]-\d{3})\b/gi;
const titleNoisePatterns = [
  /SCALE/i,
  /PROJECT\s*NO/i,
  /DRAWN\s*BY/i,
  /CHECKED\s*BY/i,
  /APPROVED\s*BY/i,
  /DATE/i
];

const disciplineRules: Array<KeywordRule<DrawingDiscipline>> = [
  { value: "civil_drainage", keywords: ["우수관", "오수관", "맨홀", "빗물받이", "배수", "포장", "옥외"] },
  { value: "window_door", keywords: ["창호일람표", "문일람표", "창호", "방화문", "DOOR", "WINDOW"] },
  { value: "waterproof", keywords: ["방수", "우레탄"] },
  { value: "finish", keywords: ["마감표", "마감", "석고보드", "천장", "바닥"] },
  { value: "steel", keywords: ["철골", "H형강", "NSG", "L-100", "ANGLE"] },
  { value: "mechanical", keywords: ["기계", "설비", "위생", "급수", "배관"] },
  { value: "electrical", keywords: ["전기", "조명", "분전반", "전열"] },
  {
    value: "rebar_concrete",
    keywords: ["구조일람표", "보일람표", "기둥일람표", "기초일람표", "슬라브일람표", "배근", "철근"]
  },
  { value: "structure", keywords: ["구조", "구조평면도", "기초", "보", "기둥", "슬라브"] },
  { value: "architecture", keywords: ["건축", "평면도", "입면도", "단면도", "상세도"] }
];

const sheetTypeRules: Array<KeywordRule<DrawingSheetType>> = [
  { value: "drawing_list", keywords: ["도면목록표", "DRAWING LIST"] },
  {
    value: "structural_schedule",
    keywords: ["구조일람표", "보일람표", "기둥일람표", "기초일람표", "슬라브일람표", "배근일람"]
  },
  { value: "structural_plan", keywords: ["구조평면도", "기초평면도", "바닥구조평면도", "ROOF FRAMING"] },
  { value: "finish_schedule", keywords: ["마감표", "실내재료", "마감상세"] },
  { value: "window_door_schedule", keywords: ["창호일람표", "문일람표", "DOOR SCHEDULE", "WINDOW SCHEDULE"] },
  { value: "quantity_table", keywords: ["수량표", "산출표", "물량표", "집계표"] },
  { value: "legend", keywords: ["범례", "LEGEND"] },
  { value: "general_note", keywords: ["일반사항", "GENERAL NOTE", "구조 일반사항"] },
  { value: "section", keywords: ["단면도", "SECTION"] },
  { value: "elevation", keywords: ["입면도", "골조입면도", "ELEVATION"] },
  { value: "detail", keywords: ["상세도", "DETAIL"] },
  { value: "architectural_plan", keywords: ["평면도", "PLAN"] }
];

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function compactText(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function includesAny(text: string, keywords: string[]): boolean {
  const compacted = compactText(text);

  return keywords.some((keyword) => compacted.includes(compactText(keyword)));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function truncate(value: string, length: number): string {
  const normalized = normalizeText(value);

  return normalized.length > length ? `${normalized.slice(0, length).trim()}...` : normalized;
}

function createStableId(parts: Array<string | number | undefined>): string {
  const source = parts.filter(Boolean).join("|");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `sheet-${hash.toString(36)}`;
}

function getSnippetAround(text: string, keywords: string[], fallbackLength = 260): string {
  const normalized = normalizeText(text);
  const upper = normalized.toUpperCase();
  const keyword = keywords.find((item) => upper.includes(item.toUpperCase()));

  if (!keyword) {
    return truncate(normalized, fallbackLength);
  }

  const index = upper.indexOf(keyword.toUpperCase());
  const start = Math.max(0, index - 90);
  const end = Math.min(normalized.length, index + fallbackLength);

  return truncate(normalized.slice(start, end), fallbackLength);
}

function findLabeledValue(text: string, labels: string[], valuePattern: RegExp): string | undefined {
  const normalized = normalizeText(text);

  for (const label of labels) {
    const labelIndex = compactText(normalized).indexOf(compactText(label));

    if (labelIndex < 0) {
      continue;
    }

    const windowText = normalized.slice(Math.max(0, labelIndex - 20), labelIndex + 160);
    const match = windowText.match(valuePattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

export function inferDrawingNo(text: string): string | undefined {
  const labeled = findLabeledValue(text, ["DRAWING NO", "도면번호", "도면 NO"], /([ASME]-\d{3})/i);

  if (labeled) {
    return labeled.toUpperCase();
  }

  const matches = [...normalizeText(text).matchAll(drawingNoPattern)].map((match) =>
    match[1].toUpperCase()
  );

  return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

export function inferDrawingTitle(text: string): string | undefined {
  const normalized = normalizeText(text);
  const labeled = findLabeledValue(
    normalized,
    ["DRAWING TITLE", "도면명", "도면 제목"],
    /([가-힣A-Za-z0-9\s./()·-]{2,80})/
  );

  if (labeled && !titleNoisePatterns.some((pattern) => pattern.test(labeled))) {
    return truncate(labeled, 60);
  }

  const titleKeywords = [
    "도면목록표",
    "구조평면도",
    "구조일람표",
    "골조입면도",
    "단열계획도",
    "마감상세도",
    "창호일람표",
    "기초",
    "보",
    "기둥",
    "슬라브",
    "PIT",
    "옥외",
    "배수",
    "방수",
    "단면도",
    "입면도",
    "상세도",
    "평면도"
  ];
  const match = normalized.match(
    /([가-힣A-Za-z0-9\s./()·-]{0,35}(?:도면목록표|구조평면도|구조일람표|골조입면도|단열계획도|마감상세도|창호일람표|기초|보|기둥|슬라브|PIT|옥외|배수|방수|단면도|입면도|상세도|평면도)[가-힣A-Za-z0-9\s./()·-]{0,35})/i
  );

  if (match?.[1]) {
    return truncate(match[1], 60);
  }

  return titleKeywords.find((keyword) => includesAny(normalized, [keyword]));
}

export function inferDrawingDiscipline(
  text: string,
  drawingNo?: string,
  title?: string
): DrawingDiscipline {
  const source = `${title ?? ""} ${text}`;

  for (const rule of disciplineRules) {
    if (includesAny(source, rule.keywords)) {
      return rule.value;
    }
  }

  if (drawingNo?.startsWith("S-")) return "structure";
  if (drawingNo?.startsWith("A-")) return "architecture";
  if (drawingNo?.startsWith("M-")) return "mechanical";
  if (drawingNo?.startsWith("E-")) return "electrical";

  return "unknown";
}

export function inferDrawingSheetType(
  text: string,
  _drawingNo?: string,
  title?: string
): DrawingSheetType {
  const source = `${title ?? ""} ${text}`;

  for (const rule of sheetTypeRules) {
    if (includesAny(source, rule.keywords)) {
      return rule.value;
    }
  }

  return "unknown";
}

export function inferFloor(text: string, title?: string): string | undefined {
  const source = `${title ?? ""} ${text}`.toUpperCase();
  const floorRules: Array<{ label: string; patterns: RegExp[] }> = [
    { label: "지하1층", patterns: [/지하\s*1층/i, /\bB1F?\b/i] },
    { label: "1층", patterns: [/(^|[^0-9])1\s*층/i, /\b1F\b/i] },
    { label: "2층", patterns: [/(^|[^0-9])2\s*층/i, /\b2F\b/i] },
    { label: "3층", patterns: [/(^|[^0-9])3\s*층/i, /\b3F\b/i] },
    { label: "지붕층", patterns: [/지붕층/i, /\bRF\b/i, /ROOF/i] },
    { label: "옥외", patterns: [/옥외/i, /외부/i, /배수/i, /포장/i] },
    { label: "공통", patterns: [/공통/i, /일반사항/i, /GENERAL NOTE/i] }
  ];
  const detected = floorRules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(source)))
    .map((rule) => rule.label);

  if (detected.length > 1) {
    return detected.includes("옥외") ? "옥외" : "복수층";
  }

  return detected[0];
}

export function inferScale(text: string): string | undefined {
  const normalized = normalizeText(text);
  const labeled = normalized.match(/(?:SCALE|축척)\s*[:\-]?\s*(1\s*\/\s*\d+|NONE|N\.?T\.?S\.?)/i);

  if (labeled?.[1]) {
    return labeled[1].replace(/\s+/g, "");
  }

  const plain = normalized.match(/\b1\s*\/\s*(50|100|150|200|300|500)\b/);

  return plain ? plain[0].replace(/\s+/g, "") : undefined;
}

function getDetectedKeywords(text: string, title?: string): string[] {
  const source = `${title ?? ""} ${text}`;
  const keywordPool = [
    "도면목록표",
    "평면도",
    "구조평면도",
    "구조일람표",
    "보일람표",
    "기둥일람표",
    "기초일람표",
    "단면도",
    "입면도",
    "상세도",
    "마감표",
    "창호일람표",
    "범례",
    "수량표",
    "우수관",
    "오수관",
    "맨홀",
    "방수",
    "철근",
    "D10",
    "D13",
    "D16",
    "D19",
    "D22",
    "D25",
    "@150",
    "@200"
  ];

  return keywordPool.filter((keyword) => includesAny(source, [keyword])).slice(0, 10);
}

export function inferQuantityReadiness(sheet: {
  discipline: DrawingDiscipline;
  sheetType: DrawingSheetType;
  detectedKeywords: string[];
}): ReadinessResult {
  if (
    sheet.sheetType === "quantity_table" ||
    sheet.sheetType === "finish_schedule" ||
    sheet.sheetType === "window_door_schedule" ||
    sheet.sheetType === "legend"
  ) {
    return {
      status: "direct_table_available",
      reason: "수량/단위 또는 기호 표가 감지되었습니다."
    };
  }

  if (sheet.sheetType === "structural_schedule") {
    return {
      status: "schedule_based_calculation",
      reason: "구조일람표로 보이며 평면도 길이와 연결하면 철근/콘크리트 산출 후보 생성이 가능합니다."
    };
  }

  if (sheet.sheetType === "structural_plan" || sheet.sheetType === "architectural_plan") {
    return {
      status: "plan_link_required",
      reason: "평면도 정보가 감지되었으나 부재 길이/개수 또는 일람표 연결이 필요합니다."
    };
  }

  if (sheet.sheetType === "section" || sheet.sheetType === "elevation" || sheet.sheetType === "detail") {
    return {
      status: "image_geometry_required",
      reason: "상세/단면 형상은 텍스트만으로 면적·길이 산출이 어려워 이미지/도형 해석이 필요합니다."
    };
  }

  if (sheet.detectedKeywords.some((keyword) => ["우수관", "오수관", "맨홀"].includes(keyword))) {
    return {
      status: "direct_table_available",
      reason: "배수 관련 수량/규격 키워드가 감지되었습니다."
    };
  }

  return {
    status: "review_required",
    reason: "도면 성격 또는 수량 산출에 필요한 정보가 불확실합니다."
  };
}

function buildSheetIndex(
  result: PdfTextExtractionResult,
  page: PdfTextExtractionResult["pages"][number]
): DrawingSheetIndexRecord {
  const drawingNo = inferDrawingNo(page.text);
  const drawingTitle = inferDrawingTitle(page.text);
  const discipline = inferDrawingDiscipline(page.text, drawingNo, drawingTitle);
  const sheetType = inferDrawingSheetType(page.text, drawingNo, drawingTitle);
  const detectedKeywords = getDetectedKeywords(page.text, drawingTitle);
  const readiness = inferQuantityReadiness({ discipline, sheetType, detectedKeywords });
  const confidenceParts = [
    drawingNo ? 0.25 : 0,
    drawingTitle ? 0.25 : 0,
    discipline !== "unknown" ? 0.2 : 0,
    sheetType !== "unknown" ? 0.2 : 0,
    detectedKeywords.length > 0 ? 0.1 : 0
  ];
  const confidence = Number(
    Math.min(
      0.95,
      confidenceParts.reduce((sum, value) => sum + value, 0.25)
    ).toFixed(2)
  );

  return {
    id: createStableId([result.fileName, page.pageNumber, drawingNo, drawingTitle]),
    sourcePage: page.pageNumber,
    sourceFileName: result.fileName,
    drawingNo,
    drawingTitle,
    discipline,
    sheetType,
    floor: inferFloor(page.text, drawingTitle),
    scale: inferScale(page.text),
    detectedKeywords,
    quantityReadinessStatus: readiness.status,
    quantityReadinessReason: readiness.reason,
    relatedSheetIds: [],
    confidence,
    sourceTextSnippet: getSnippetAround(page.text, detectedKeywords)
  };
}

export function extractDrawingSheetIndexesFromPdfResults(
  results: PdfTextExtractionResult[]
): DrawingSheetIndexRecord[] {
  return results.reduce<DrawingSheetIndexRecord[]>((records, result) => {
    const sheetRecords = result.pages.map((page) => buildSheetIndex(result, page));

    return [...records, ...sheetRecords];
  }, []);
}

function createReference(
  fromSheetId: string,
  toSheetId: string,
  relationType: DrawingReferenceRecord["relationType"],
  reason: string,
  confidence: number
): DrawingReferenceRecord {
  return {
    id: `ref-${fromSheetId}-${toSheetId}-${relationType}`,
    fromSheetId,
    toSheetId,
    relationType,
    reason,
    confidence
  };
}

export function buildDrawingReferences(sheets: DrawingSheetIndexRecord[]): DrawingReferenceRecord[] {
  const references: DrawingReferenceRecord[] = [];

  for (const from of sheets) {
    for (const to of sheets) {
      if (from.id === to.id) {
        continue;
      }

      if (from.sheetType === "structural_plan" && to.sheetType === "structural_schedule") {
        references.push(
          createReference(from.id, to.id, "plan_to_schedule", "구조평면도와 구조일람표 연결 후보", 0.82)
        );
      } else if (from.sheetType === "architectural_plan" && to.sheetType === "finish_schedule") {
        references.push(
          createReference(from.id, to.id, "plan_to_schedule", "건축평면도와 마감표 연결 후보", 0.76)
        );
      } else if (
        from.sheetType === "architectural_plan" &&
        to.sheetType === "window_door_schedule"
      ) {
        references.push(
          createReference(from.id, to.id, "symbol_to_schedule", "평면도 창호 기호와 창호일람표 연결 후보", 0.76)
        );
      } else if (
        from.discipline === "civil_drainage" &&
        (to.sheetType === "legend" || to.sheetType === "quantity_table")
      ) {
        references.push(
          createReference(from.id, to.id, "plan_to_legend", "옥외/배수 도면과 범례·수량표 연결 후보", 0.74)
        );
      } else if (
        from.floor &&
        to.floor &&
        from.floor === to.floor &&
        from.discipline === to.discipline
      ) {
        references.push(
          createReference(from.id, to.id, "floor_related", "같은 공종과 층으로 묶이는 도면 후보", 0.58)
        );
      } else if (
        from.discipline !== "unknown" &&
        from.discipline === to.discipline &&
        from.drawingNo?.slice(0, 1) === to.drawingNo?.slice(0, 1)
      ) {
        references.push(
          createReference(from.id, to.id, "same_discipline", "같은 도면 체계와 공종으로 묶이는 후보", 0.48)
        );
      }
    }
  }

  const seen = new Set<string>();

  return references.filter((reference) => {
    const key = `${reference.fromSheetId}-${reference.toSheetId}-${reference.relationType}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getSheetLabels(
  sheets: DrawingSheetIndexRecord[],
  predicate: (sheet: DrawingSheetIndexRecord) => boolean
): string[] {
  return sheets
    .filter(predicate)
    .slice(0, 8)
    .map((sheet) => `${sheet.drawingNo ?? `p.${sheet.sourcePage}`} ${sheet.drawingTitle ?? ""}`.trim());
}

export function buildQuantityRoadmap(
  sheets: DrawingSheetIndexRecord[]
): DrawingQuantityRoadmapRecord[] {
  const structuralSchedules = getSheetLabels(sheets, (sheet) => sheet.sheetType === "structural_schedule");
  const structuralPlans = getSheetLabels(sheets, (sheet) => sheet.sheetType === "structural_plan");
  const finishSchedules = getSheetLabels(sheets, (sheet) => sheet.sheetType === "finish_schedule");
  const architecturalPlans = getSheetLabels(sheets, (sheet) => sheet.sheetType === "architectural_plan");
  const windowSchedules = getSheetLabels(sheets, (sheet) => sheet.sheetType === "window_door_schedule");
  const waterproofSheets = getSheetLabels(sheets, (sheet) => sheet.discipline === "waterproof");
  const drainageSheets = getSheetLabels(sheets, (sheet) => sheet.discipline === "civil_drainage");
  const legendOrQuantitySheets = getSheetLabels(
    sheets,
    (sheet) => sheet.sheetType === "legend" || sheet.sheetType === "quantity_table"
  );

  return [
    {
      id: "roadmap-rebar",
      discipline: "rebar_concrete",
      workCategory: "철근콘크리트공사",
      targetQuantity: "철근 수량",
      requiredSheets: ["구조일람표", "구조평면도"],
      availableSheets: [...structuralSchedules, ...structuralPlans],
      missingData: ["부재 길이", "정착/이음/갈고리", "반복개수"],
      nextAction: "철근 수량 산출 후보 검토 및 길이/반복개수 보정",
      readiness:
        structuralSchedules.length > 0 ? "schedule_based_calculation" : "plan_link_required"
    },
    {
      id: "roadmap-concrete",
      discipline: "rebar_concrete",
      workCategory: "철근콘크리트공사",
      targetQuantity: "콘크리트 수량",
      requiredSheets: ["구조평면도", "구조일람표"],
      availableSheets: [...structuralPlans, ...structuralSchedules],
      missingData: ["부재 길이", "슬라브 면적", "층고"],
      nextAction: "부재별 단면과 길이를 연결해 m3 후보 생성",
      readiness: structuralPlans.length > 0 ? "plan_link_required" : "review_required"
    },
    {
      id: "roadmap-finish",
      discipline: "finish",
      workCategory: "마감공사",
      targetQuantity: "마감 면적",
      requiredSheets: ["마감표", "평면도"],
      availableSheets: [...finishSchedules, ...architecturalPlans],
      missingData: ["실별 면적", "벽/바닥/천장 면적"],
      nextAction: "마감표 행 단위 추출 및 실별 면적 연결",
      readiness: finishSchedules.length > 0 ? "direct_table_available" : "plan_link_required"
    },
    {
      id: "roadmap-window-door",
      discipline: "window_door",
      workCategory: "창호공사",
      targetQuantity: "문·창호 개수",
      requiredSheets: ["평면도", "창호일람표"],
      availableSheets: [...architecturalPlans, ...windowSchedules],
      missingData: ["기호별 개수"],
      nextAction: "D/W 기호와 일람표 연결",
      readiness: windowSchedules.length > 0 ? "direct_table_available" : "plan_link_required"
    },
    {
      id: "roadmap-waterproof",
      discipline: "waterproof",
      workCategory: "방수공사",
      targetQuantity: "방수 면적",
      requiredSheets: ["방수 범례", "평면도", "단면/상세"],
      availableSheets: waterproofSheets,
      missingData: ["방수 적용 면적"],
      nextAction: "방수 범례표와 적용 위치 연결",
      readiness: waterproofSheets.length > 0 ? "plan_link_required" : "review_required"
    },
    {
      id: "roadmap-drainage",
      discipline: "civil_drainage",
      workCategory: "토목/배수공사",
      targetQuantity: "관로·맨홀 수량",
      requiredSheets: ["옥외계획도", "배수 범례표"],
      availableSheets: [...drainageSheets, ...legendOrQuantitySheets],
      missingData: ["관로 길이", "범례표 수량"],
      nextAction: "범례표 행 단위 추출",
      readiness: legendOrQuantitySheets.length > 0 ? "direct_table_available" : "plan_link_required"
    }
  ];
}

export function attachDrawingReferencesToSheets(
  sheets: DrawingSheetIndexRecord[],
  references: DrawingReferenceRecord[]
): DrawingSheetIndexRecord[] {
  return sheets.map((sheet) => ({
    ...sheet,
    relatedSheetIds: unique(
      references
        .filter((reference) => reference.fromSheetId === sheet.id)
        .map((reference) => reference.toSheetId)
    )
  }));
}
