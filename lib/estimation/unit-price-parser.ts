import type { UnitPriceRecord } from "@/lib/estimation/types";

type SheetRow = Array<string | number | boolean | Date | null | undefined>;

function toText(value: unknown): string {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = toText(value).replaceAll(",", "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export async function parseArchitectureUnitPriceWorkbook(
  file: File
): Promise<UnitPriceRecord[]> {
  const data = await file.arrayBuffer();
  const xlsx = await import("xlsx");
  const workbook = xlsx.read(data, { type: "array" });
  const sheet = workbook.Sheets["일위대가"];

  if (!sheet) {
    throw new Error("일위대가 시트를 찾을 수 없습니다.");
  }

  const rows = xlsx.utils.sheet_to_json<SheetRow>(sheet, {
    blankrows: false,
    defval: "",
    header: 1
  });

  return rows.slice(3).reduce<UnitPriceRecord[]>((records, row, index) => {
    const code = toText(row[0]);
    const itemName = toText(row[2]);

    if (!code || !itemName) {
      return records;
    }

    const materialCost = toNumber(row[5]);
    const laborCost = toNumber(row[6]);
    const expenseCost = toNumber(row[7]);
    const explicitUnitPrice = toNumber(row[8]);
    const unitPrice = explicitUnitPrice || materialCost + laborCost + expenseCost;

    records.push({
      id: `unit-price-${code || index}`,
      code,
      itemName,
      specification: toText(row[3]),
      unit: toText(row[4]),
      materialCost,
      laborCost,
      expenseCost,
      unitPrice,
      note: toText(row[10]) || undefined,
      source: "uploaded_architecture_unit_price"
    });

    return records;
  }, []);
}
