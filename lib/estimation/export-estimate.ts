import type { EstimateExportRow, EstimateItemRecord } from "@/lib/estimation/types";

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
  if (item.matchSource === "uploaded_pdf") {
    const details = [
      "uploaded_pdf",
      item.sourceFileName ? `출처파일: ${item.sourceFileName}` : null,
      item.sourcePage ? `p.${item.sourcePage}` : null,
      item.quantityReviewRequired || item.quantity <= 0
        ? item.quantity <= 0
          ? "수량 0 추출값 검토 필요"
          : "수량 검토 필요"
        : null,
      item.reviewStatus === "accepted" || item.reviewStatus === "edited" ? "사용자 승인" : null
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
