import type {
  EstimateExportRow,
  EstimateItemRecord,
  EstimateStatementItemRecord,
  StatementReviewStatus
} from "@/lib/estimation/types";

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
