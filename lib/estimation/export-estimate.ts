import type { EstimateExportRow, EstimateItemRecord } from "@/lib/estimation/types";

function toExportRows(items: EstimateItemRecord[]): EstimateExportRow[] {
  return items.map((item) => ({
    workCategory: item.workCategory,
    itemName: item.itemName,
    specification: item.specification ?? "",
    quantity: item.quantity,
    unit: item.unit,
    calculationBasis: item.calculationBasis ?? "",
    standardItemName: item.standardItemName,
    drawingNo: item.drawingNo ?? "",
    drawingTitle: item.drawingTitle ?? "",
    reviewStatus: item.reviewStatus,
    remark: item.remark ?? ""
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

export function exportEstimateToCsv(items: EstimateItemRecord[], fileName = "estimate-items.csv") {
  const header = [
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

  const rows = toExportRows(items).map((item) => [
    item.workCategory,
    item.itemName,
    item.specification,
    String(item.quantity),
    item.unit,
    item.calculationBasis,
    item.standardItemName,
    item.drawingNo,
    item.drawingTitle,
    item.reviewStatus,
    item.remark
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }), fileName);
}

export function exportEstimateToExcel(items: EstimateItemRecord[], fileName = "estimate-items.xls") {
  const rows = toExportRows(items);
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

  const tableRows = rows
    .map(
      (item) => `
        <tr>
          <td>${item.workCategory}</td>
          <td>${item.itemName}</td>
          <td>${item.specification}</td>
          <td>${item.quantity}</td>
          <td>${item.unit}</td>
          <td>${item.calculationBasis}</td>
          <td>${item.standardItemName}</td>
          <td>${item.drawingNo}</td>
          <td>${item.drawingTitle}</td>
          <td>${item.reviewStatus}</td>
          <td>${item.remark}</td>
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
            <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
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
