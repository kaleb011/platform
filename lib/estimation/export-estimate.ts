import type {
  EstimateExportRow,
  EstimateItemRecord,
  EstimateStatementItemRecord,
  ManualEstimateStatementItemRecord,
  RebarQuantityCandidateRecord,
  RebarStandardEstimateItem,
  RebarStandardSettings,
  RebarStandardSummary,
  StatementReviewStatus
} from "@/lib/estimation/types";
import {
  buildRebarReviewEvidenceNote,
  getChecklistCompletion,
  getReferenceDrawingLabel,
  getReviewCompletenessLabel,
  getSourceTypeLabel,
  resolveReviewCompleteness
} from "@/lib/estimation/rebar-evidence";
import { getEffectiveRebarRole } from "@/lib/estimation/rebar-quantity";

function hasAdvancedRebarAdjustments(candidate: RebarQuantityCandidateRecord) {
  return [
    candidate.anchorageLengthMm,
    candidate.spliceLengthMm,
    candidate.hookLengthMm,
    candidate.deductionLengthMm,
    candidate.bendCorrectionMm
  ].some((value) => typeof value === "number" && value > 0);
}

function buildBeamStirrupSegmentExportNote(candidate: RebarQuantityCandidateRecord) {
  const effectiveRole = getEffectiveRebarRole(candidate);

  if (candidate.memberType === "beam" && effectiveRole === "main") {
    return [
      "산출 모드: 보 주근",
      `보 길이 ${candidate.memberLengthMm ?? ""}mm`,
      `직접 본수 ${candidate.manualBarCount ?? candidate.barCount ?? ""}본`,
      `정착 ${candidate.anchorageLengthMm ?? 0}mm`,
      `이음 ${candidate.spliceLengthMm ?? 0}mm`,
      `갈고리 ${candidate.hookLengthMm ?? 0}mm`,
      `절곡 ${candidate.bendCorrectionMm ?? 0}mm`,
      `공제 ${candidate.deductionLengthMm ?? 0}mm`,
      `단위중량 ${candidate.unitWeightKgPerM}kg/m`,
      `정미중량 ${candidate.quantityKg}kg`,
      `자재중량 ${candidate.materialQuantityKg ?? ""}kg`
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (
    candidate.memberType === "beam" &&
    (effectiveRole === "stirrup" || effectiveRole === "shear") &&
    candidate.beamStirrupCalculationMode !== "segmented_spacing"
  ) {
    return [
      "산출 모드: 보 늑근/전단근",
      `보 폭/춤/피복 ${candidate.sectionWidthMm ?? ""}/${candidate.sectionDepthMm ?? ""}/${candidate.coverMm ?? ""}mm`,
      `늑근 1개 길이 ${candidate.singleBarLengthM ?? ""}m`,
      candidate.spacingMm ? `간격 @${candidate.spacingMm}` : null,
      candidate.manualBarCount ? `override ${candidate.manualBarCount}본` : null,
      `정미중량 ${candidate.quantityKg}kg`,
      `자재중량 ${candidate.materialQuantityKg ?? ""}kg`
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (candidate.beamStirrupCalculationMode !== "segmented_spacing") {
    return candidate.beamStirrupCalculationMode === "single_spacing" ? "단일 간격" : "";
  }

  return [
    "단부/중앙부 분리",
    `좌측 ${candidate.beamStirrupLeftEndLengthMm ?? ""}mm / @${candidate.beamStirrupLeftSpacingMm ?? ""} / ${candidate.beamStirrupLeftCount ?? ""}본`,
    `중앙 ${candidate.beamStirrupCenterLengthMm ?? ""}mm / @${candidate.beamStirrupCenterSpacingMm ?? ""} / ${candidate.beamStirrupCenterCount ?? ""}본`,
    `우측 ${candidate.beamStirrupRightEndLengthMm ?? ""}mm / @${candidate.beamStirrupRightSpacingMm ?? ""} / ${candidate.beamStirrupRightCount ?? ""}본`,
    `총 ${candidate.beamStirrupTotalCount ?? candidate.barCount ?? ""}본`,
    `1개 길이 ${candidate.beamStirrupUnitLengthMm ?? ""}mm`,
    candidate.beamStirrupSegmentNote ?? ""
  ]
    .filter(Boolean)
    .join(" / ");
}

function getExportQuantity(item: EstimateItemRecord): string | number {
  return item.quantityReviewRequired || item.quantity <= 0 ? "검토 필요" : item.quantity;
}

function getExportUnit(item: EstimateItemRecord): string {
  if ((item.quantityReviewRequired || item.quantity <= 0) && (!item.unit || item.unit === "식")) {
    return "검토 필요";
  }

  return item.unit || "-";
}

function buildExportRemark(item: EstimateItemRecord): string {
  if (item.matchSource === "rebar") {
    return [
      "rebar_quantity",
      "기본 수량: 정미중량 kg",
      item.sourceFileName ? `출처파일: ${item.sourceFileName}` : null,
      item.sourcePage ? `PDF p.${item.sourcePage}` : null,
      item.sourceNote ?? item.remark ?? null
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (item.matchSource === "uploaded_pdf" || item.matchSource === "manual") {
    const sourceLabel = item.matchSource === "manual" ? "manual_match" : "uploaded_pdf";
    const details = [
      sourceLabel,
      item.matchSource === "manual" ? "uploaded_pdf" : null,
      item.sourceFileName ? `출처파일: ${item.sourceFileName}` : null,
      item.sourcePage ? `p.${item.sourcePage}` : null,
      item.quantityReviewRequired || item.quantity <= 0
        ? item.quantity <= 0
          ? "수량 0 추출값 검토 필요"
          : "수량 검토 필요"
        : null,
      item.matchSource === "manual"
        ? "사용자 수동 매칭 승인"
        : item.reviewStatus === "accepted" || item.reviewStatus === "edited"
          ? "사용자 승인"
          : null
    ].filter(Boolean);

    return details.join(" / ");
  }

  return item.remark ?? "sample data 기반 승인";
}

function toExportRows(items: EstimateItemRecord[]): EstimateExportRow[] {
  return items.map((item) => ({
    workCategory: item.workCategory,
    itemName: item.itemName,
    specification: item.specification ?? "",
    quantity: getExportQuantity(item),
    unit: getExportUnit(item),
    calculationBasis: item.calculationBasis ?? "",
    standardItemName: item.standardItemName,
    drawingNo: item.drawingNo ?? "",
    drawingTitle: item.drawingTitle ?? "",
    reviewStatus: item.reviewStatus,
    remark: buildExportRemark(item)
  }));
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const headers = [
  "공종",
  "품명",
  "규격",
  "수량",
  "단위",
  "산출근거",
  "표준품셈 항목",
  "도면번호",
  "도면명",
  "검수상태",
  "비고"
];

export function exportEstimateToCsv(items: EstimateItemRecord[], fileName = "estimate-items.csv") {
  const rows = toExportRows(items).map((item) => [
    item.workCategory,
    item.itemName,
    item.specification,
    item.quantity,
    item.unit,
    item.calculationBasis,
    item.standardItemName,
    item.drawingNo,
    item.drawingTitle,
    item.reviewStatus,
    item.remark
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }), fileName);
}

export function exportEstimateToExcel(items: EstimateItemRecord[], fileName = "estimate-items.xls") {
  const rows = toExportRows(items);

  const tableRows = rows
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.workCategory)}</td>
          <td>${escapeHtml(item.itemName)}</td>
          <td>${escapeHtml(item.specification)}</td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td>${escapeHtml(item.calculationBasis)}</td>
          <td>${escapeHtml(item.standardItemName)}</td>
          <td>${escapeHtml(item.drawingNo)}</td>
          <td>${escapeHtml(item.drawingTitle)}</td>
          <td>${escapeHtml(item.reviewStatus)}</td>
          <td>${escapeHtml(item.remark)}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    fileName
  );
}

function getStatementQuantity(item: EstimateStatementItemRecord): string | number {
  return item.quantityReviewRequired || item.quantity <= 0 ? "수량 확인 필요" : item.quantity;
}

const statementReviewStatusLabel: Record<StatementReviewStatus, string> = {
  calculated: "산출 가능",
  quantity_review_required: "수량 확인 필요",
  unit_price_match_required: "일위대가 매칭 필요",
  unit_check_required: "단위 확인 필요",
  match_review_required: "매칭 검토 필요"
};

function getStatementCostCell(item: EstimateStatementItemRecord, value: number): string | number {
  return item.unitPriceMatched ? value : "-";
}

function getStatementUnitPriceCell(item: EstimateStatementItemRecord): string | number {
  if (!item.unitPriceMatched) {
    return "-";
  }

  return item.unitPrice <= 0 ? "단가 확인 필요" : item.unitPrice;
}

function getStatementAmountCell(item: EstimateStatementItemRecord): string | number {
  if (item.statementReviewStatus === "calculated") {
    return item.amount;
  }

  if (item.statementReviewStatus === "quantity_review_required") {
    return "수량 확인 필요";
  }

  if (item.statementReviewStatus === "unit_check_required") {
    return "단위 확인 필요";
  }

  if (item.statementReviewStatus === "match_review_required") {
    return "매칭 검토 필요";
  }

  return "검토 필요";
}

export function exportEstimateStatementToExcel(
  statementItems: EstimateStatementItemRecord[],
  fileName = "estimate-statement-items.xls"
) {
  const statementHeaders = [
    "공종",
    "품명",
    "규격",
    "수량",
    "단위",
    "재료비",
    "노무비",
    "경비",
    "합계단가",
    "금액",
    "일위대가코드",
    "일위대가항목",
    "산출근거",
    "도면번호",
    "도면명",
    "검토상태",
    "비고"
  ];

  const tableRows = statementItems
    .map((item) => {
      const calculationBasis = item.unitPriceMatched
        ? item.unitPriceMatchReason ?? "업로드 일위대가 항목 매칭"
        : "일위대가 매칭 필요";

      return `
        <tr>
          <td>${escapeHtml(item.workCategory)}</td>
          <td>${escapeHtml(item.itemName)}</td>
          <td>${escapeHtml(item.specification)}</td>
          <td>${escapeHtml(getStatementQuantity(item))}</td>
          <td>${escapeHtml(item.unit || "-")}</td>
          <td>${escapeHtml(getStatementCostCell(item, item.materialCost))}</td>
          <td>${escapeHtml(getStatementCostCell(item, item.laborCost))}</td>
          <td>${escapeHtml(getStatementCostCell(item, item.expenseCost))}</td>
          <td>${escapeHtml(getStatementUnitPriceCell(item))}</td>
          <td>${escapeHtml(getStatementAmountCell(item))}</td>
          <td>${escapeHtml(item.unitPriceCode ?? "")}</td>
          <td>${escapeHtml(item.unitPriceItemName ?? "일위대가 매칭 필요")}</td>
          <td>${escapeHtml(calculationBasis)}</td>
          <td>${escapeHtml(item.sourceDrawingNo ?? "")}</td>
          <td>${escapeHtml(item.sourceDrawingName ?? "")}</td>
          <td>${escapeHtml(statementReviewStatusLabel[item.statementReviewStatus])}</td>
          <td>${escapeHtml(item.remark ?? "")}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${statementHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    fileName
  );
}

function getManualStatementQuantity(item: ManualEstimateStatementItemRecord): string | number {
  return item.quantityReviewRequired || item.quantity <= 0 ? "수량 확인 필요" : item.quantity;
}

function getManualStatementUnitPrice(item: ManualEstimateStatementItemRecord): string | number {
  return typeof item.manualUnitPrice === "number" && item.manualUnitPrice > 0
    ? item.manualUnitPrice
    : "단가 입력 필요";
}

function getManualStatementAmount(item: ManualEstimateStatementItemRecord): string | number {
  if (item.status === "calculated" && typeof item.amount === "number") {
    return item.amount;
  }

  if (item.status === "quantity_review_required") {
    return "수량 확인 필요";
  }

  return "단가 입력 필요";
}

const manualStatementStatusLabel = {
  calculated: "금액 산출 완료",
  quantity_review_required: "수량 확인 필요",
  unit_price_required: "단가 입력 필요"
} as const;

export function exportManualEstimateStatementToExcel(
  statementItems: ManualEstimateStatementItemRecord[],
  fileName = "manual-estimate-statement.xls"
) {
  const statementHeaders = [
    "공종",
    "품명",
    "규격",
    "수량",
    "단위",
    "공사단가",
    "금액",
    "산출근거",
    "도면번호",
    "도면명",
    "검토상태",
    "비고"
  ];

  const tableRows = statementItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.workCategory)}</td>
          <td>${escapeHtml(item.itemName)}</td>
          <td>${escapeHtml(item.specification)}</td>
          <td>${escapeHtml(getManualStatementQuantity(item))}</td>
          <td>${escapeHtml(item.unit || "-")}</td>
          <td>${escapeHtml(getManualStatementUnitPrice(item))}</td>
          <td>${escapeHtml(getManualStatementAmount(item))}</td>
          <td>${escapeHtml(item.calculationBasis ?? "")}</td>
          <td>${escapeHtml(item.sourceDrawingNo ?? "")}</td>
          <td>${escapeHtml(item.sourceDrawingName ?? "")}</td>
          <td>${escapeHtml(manualStatementStatusLabel[item.status])}</td>
          <td>${escapeHtml(item.remark ?? "")}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${statementHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    fileName
  );
}

export function exportRebarQuantityCandidatesToExcel(
  candidates: RebarQuantityCandidateRecord[],
  fileName = "rebar-quantity-candidates.xls"
) {
  const rebarHeaders = [
    "부재명",
    "부재 종류",
    "철근 위치",
    "철근 규격",
    "철근 개수",
    "간격",
    "보 늑근 산출 모드",
    "보 늑근 좌측 단부",
    "보 늑근 중앙부",
    "보 늑근 우측 단부",
    "보 늑근 총 본수",
    "보 늑근 1개 길이 mm",
    "보 늑근 구간 검토",
    "단위중량",
    "1본 길이 m",
    "길이/높이/기초치수",
    "반복개수",
    "면수",
    "정미중량 kg",
    "정미중량 ton",
    "자재중량 kg",
    "자재중량 ton",
    "LOSS율",
    "고급 보정 적용 여부",
    "산출식",
    "산출근거",
    "구조일반사항 적용 여부",
    "적용 구조일반사항 기준",
    "구조일반사항 검토 필요",
    "구조도면 우선 안내",
    "출처파일",
    "출처페이지",
    "참조도면",
    "출처유형",
    "부재목록출처",
    "감지철근스펙",
    "검토상태",
    "체크리스트 완료율",
    "검토메모",
    "사용자 보정 여부",
    "후속 확인 필요 여부",
    "검토상태",
    "비고"
  ];

  const rows = candidates
    .map((candidate) => {
      const sizeLabel = [
        candidate.memberLengthMm ? `L=${candidate.memberLengthMm}` : null,
        candidate.memberHeightMm ? `H=${candidate.memberHeightMm}` : null,
        candidate.sectionWidthMm && candidate.sectionDepthMm
          ? `${candidate.sectionWidthMm}x${candidate.sectionDepthMm}`
          : null,
        candidate.footingWidthMm && candidate.footingLengthMm
          ? `기초 ${candidate.footingWidthMm}x${candidate.footingLengthMm}`
          : null
      ]
        .filter(Boolean)
        .join(" / ");
      const completeness = candidate.reviewCompleteness ?? resolveReviewCompleteness(candidate);
      const checklist = getChecklistCompletion(candidate);
      const followUpRequired = candidate.quantityReviewRequired || completeness !== "complete";
      const advancedApplied = hasAdvancedRebarAdjustments(candidate);
      const beamStirrupSegmentNote = buildBeamStirrupSegmentExportNote(candidate);

      return `
        <tr>
          <td>${escapeHtml(candidate.memberName ?? "")}</td>
          <td>${escapeHtml(candidate.memberType)}</td>
          <td>${escapeHtml(candidate.position)}</td>
          <td>${escapeHtml(candidate.diameter)}</td>
          <td>${escapeHtml(candidate.barCount ?? "")}</td>
          <td>${escapeHtml(candidate.spacingMm ? `@${candidate.spacingMm}` : "")}</td>
          <td>${escapeHtml(candidate.beamStirrupCalculationMode ?? "")}</td>
          <td>${escapeHtml(candidate.beamStirrupCalculationMode === "segmented_spacing" ? `${candidate.beamStirrupLeftEndLengthMm ?? ""}mm / @${candidate.beamStirrupLeftSpacingMm ?? ""} / ${candidate.beamStirrupLeftCount ?? ""}본` : "")}</td>
          <td>${escapeHtml(candidate.beamStirrupCalculationMode === "segmented_spacing" ? `${candidate.beamStirrupCenterLengthMm ?? ""}mm / @${candidate.beamStirrupCenterSpacingMm ?? ""} / ${candidate.beamStirrupCenterCount ?? ""}본` : "")}</td>
          <td>${escapeHtml(candidate.beamStirrupCalculationMode === "segmented_spacing" ? `${candidate.beamStirrupRightEndLengthMm ?? ""}mm / @${candidate.beamStirrupRightSpacingMm ?? ""} / ${candidate.beamStirrupRightCount ?? ""}본` : "")}</td>
          <td>${escapeHtml(candidate.beamStirrupTotalCount ?? "")}</td>
          <td>${escapeHtml(candidate.beamStirrupUnitLengthMm ?? "")}</td>
          <td>${escapeHtml(beamStirrupSegmentNote)}</td>
          <td>${escapeHtml(candidate.unitWeightKgPerM)}</td>
          <td>${escapeHtml(candidate.singleBarLengthM ?? "")}</td>
          <td>${escapeHtml(sizeLabel)}</td>
          <td>${escapeHtml(candidate.memberCount)}</td>
          <td>${escapeHtml(candidate.faceCount ?? 1)}</td>
          <td>${escapeHtml(candidate.quantityReviewRequired ? "검토 필요" : candidate.quantityKg)}</td>
          <td>${escapeHtml(candidate.quantityReviewRequired ? "검토 필요" : candidate.quantityTon)}</td>
          <td>${escapeHtml(candidate.quantityReviewRequired ? "검토 필요" : candidate.materialQuantityKg ?? "")}</td>
          <td>${escapeHtml(candidate.quantityReviewRequired ? "검토 필요" : candidate.materialQuantityTon ?? "")}</td>
          <td>${escapeHtml(candidate.lossRate ?? "")}</td>
          <td>${escapeHtml(advancedApplied ? "Y" : "N")}</td>
          <td>${escapeHtml(candidate.calculationFormula)}</td>
          <td>${escapeHtml(candidate.calculationBasis)}</td>
          <td>${escapeHtml(candidate.appliedGeneralRuleIds?.length ? "Y" : "N")}</td>
          <td>${escapeHtml(candidate.appliedGeneralRuleIds?.join(", ") ?? "")}</td>
          <td>${escapeHtml(candidate.generalRuleReviewRequired ? "Y" : "N")}</td>
          <td>${escapeHtml(candidate.appliedGeneralRuleIds?.length ? "구조도면과 구조일반사항이 상충할 경우 구조도면 우선" : "")}</td>
          <td>${escapeHtml(candidate.sourceFileName ?? "")}</td>
          <td>${escapeHtml(candidate.sourcePage ? `p.${candidate.sourcePage}` : "")}</td>
          <td>${escapeHtml(getReferenceDrawingLabel(candidate))}</td>
          <td>${escapeHtml(getSourceTypeLabel(candidate))}</td>
          <td>${escapeHtml(candidate.memberListSource ?? "")}</td>
          <td>${escapeHtml(candidate.detectedSpecs?.join(", ") ?? "")}</td>
          <td>${escapeHtml(getReviewCompletenessLabel(completeness))}</td>
          <td>${escapeHtml(checklist.total > 0 ? `${checklist.completed}/${checklist.total} (${checklist.percent}%)` : "")}</td>
          <td>${escapeHtml(candidate.reviewNote ?? candidate.reviewerComment ?? "")}</td>
          <td>${escapeHtml(candidate.reviewNote || candidate.manualBarCount || candidate.memberCount !== 1 || candidate.appliedGeneralRuleIds?.length || advancedApplied ? "Y" : "N")}</td>
          <td>${escapeHtml(followUpRequired ? "Y" : "N")}</td>
          <td>${escapeHtml(candidate.reviewStatus)}</td>
          <td>${escapeHtml(buildRebarReviewEvidenceNote(candidate) || candidate.note || "")}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${rebarHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    fileName
  );
}

const rebarStandardTypeLabel = {
  building_type_1: "건축 Type-I",
  building_type_2: "건축 Type-II",
  civil_type_1: "토목 Type-I",
  civil_type_2: "토목 Type-II",
  civil_type_3: "토목 Type-III"
} as const;

const rebarReviewStatusLabel = {
  calculated: "산출 가능",
  price_required: "단가 입력 필요",
  quantity_required: "수량 확인 필요",
  separate_input_required: "별도계상 필요"
} as const;

const rebarCategoryLabel = {
  material: "재료비",
  labor: "노무비",
  expense: "경비",
  consumable: "소모재료",
  separate: "별도계상"
} as const;

function renderExcelTable(headers: string[], rows: Array<Array<string | number>>) {
  return `
    <table border="1">
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function exportRebarStandardEstimateToExcel(
  summary: RebarStandardSummary,
  settings: RebarStandardSettings,
  items: RebarStandardEstimateItem[],
  fileName = "rebar-standard-estimate.xls"
) {
  const quantityRows = Object.entries(summary.diameterWeightsKg)
    .sort(([left], [right]) => Number(left.slice(1)) - Number(right.slice(1)))
    .map(([diameter, weightKg]) => [
      diameter,
      weightKg,
      summary.diameterWeightsTon[diameter] ?? 0,
      Number(diameter.replace(/\D/g, "")) <= 13 ? "Y" : "N",
      "승인된 철근 수량 기준"
    ]);

  const settingRows: Array<Array<string | number>> = [
    ["공사구분", settings.projectType === "building" ? "건축" : "토목", ""],
    ["추천 Type", rebarStandardTypeLabel[summary.recommendedType], summary.recommendationReason],
    ["적용 Type", rebarStandardTypeLabel[settings.selectedType], ""],
    ["D13 이하 비율", `${summary.underD13Ratio}%`, ""],
    ["철골 병행 여부", settings.steelConcurrent ? "Y" : "N", ""],
    ["복잡 구조시설물 여부", settings.complexStructure ? "Y" : "N", ""],
    ["현장가공/공장가공", settings.processingMethod === "site_processing" ? "현장가공" : "공장가공", "공장가공은 후속 반영"],
    ["철근공 노임단가", settings.rebarWorkerWage ?? "", "원/인"],
    ["보통인부 노임단가", settings.commonWorkerWage ?? "", "원/인"]
  ];

  const estimateRows = items.map((item) => [
    rebarCategoryLabel[item.category],
    item.workCategory,
    item.itemName,
    item.itemName,
    item.specification,
    item.quantity,
    item.unit,
    item.materialCost,
    item.laborCost,
    item.expenseCost,
    item.totalCost,
    item.standardCode,
    item.basis,
    rebarReviewStatusLabel[item.reviewStatus],
    item.note ?? ""
  ]);

  const separateRows = items
    .filter(
      (item) =>
        item.category === "separate" ||
        item.reviewStatus === "separate_input_required" ||
        ["크레인 양중비", "현장 내 운반비", "shop drawing 작성비"].includes(item.itemName)
    )
    .map((item) => [
      item.itemName,
      item.quantity,
      item.unit,
      item.totalCost,
      rebarReviewStatusLabel[item.reviewStatus],
      item.note ?? item.basis
    ]);

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <h3>철근 수량 집계</h3>
        ${renderExcelTable(["직경", "수량 kg", "수량 ton", "D13 이하 여부", "비고"], quantityRows)}

        <h3>품셈 적용 설정</h3>
        ${renderExcelTable(["항목", "값", "비고"], settingRows)}

        <h3>철근 품셈 산출내역</h3>
        ${renderExcelTable(
          [
            "구분",
            "공종",
            "세부공종",
            "품명",
            "규격",
            "수량",
            "단위",
            "재료비",
            "노무비",
            "경비",
            "합계금액",
            "품셈근거",
            "산출근거",
            "검토상태",
            "비고"
          ],
          estimateRows
        )}

        <h3>별도계상 항목</h3>
        ${renderExcelTable(["항목", "수량", "단위", "금액", "상태", "비고"], separateRows)}
      </body>
    </html>
  `;

  downloadBlob(
    new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    fileName
  );
}
