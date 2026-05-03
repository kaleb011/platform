import type { PdfPageTextRecord, PdfTextExtractionResult } from "@/lib/estimation/types";

type PdfTextItem = {
  str?: string;
};

type PdfTextContent = {
  items: PdfTextItem[];
};

type PdfPageProxyLike = {
  getTextContent: () => Promise<PdfTextContent>;
};

type PdfDocumentProxyLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxyLike>;
  destroy?: () => Promise<void> | void;
};

type PdfLoadingTaskLike = {
  promise: Promise<PdfDocumentProxyLike>;
};

type PdfJsModuleLike = {
  getDocument: (source: { data: Uint8Array; disableWorker: boolean }) => PdfLoadingTaskLike;
};

function getExtractionStatus(text: string): PdfPageTextRecord["extractionStatus"] {
  return text.trim().length > 0 ? "success" : "empty";
}

function getResultStatus(pages: PdfPageTextRecord[]): PdfTextExtractionResult["status"] {
  const successCount = pages.filter((page) => page.extractionStatus === "success").length;
  const failedCount = pages.filter((page) => page.extractionStatus === "failed").length;

  if (successCount > 0 && failedCount === 0) {
    return "success";
  }

  if (successCount > 0) {
    return "partial";
  }

  return "failed";
}

export async function extractPdfTextFromFile(file: File): Promise<PdfTextExtractionResult> {
  try {
    const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJsModuleLike;
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data, disableWorker: true });
    const pdf = await loadingTask.promise;
    const pages: PdfPageTextRecord[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      try {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => item.str ?? "")
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        pages.push({
          id: `pdf-page-text-${pageNumber}`,
          drawingFileId: "",
          pageNumber,
          text,
          textLength: text.length,
          extractionStatus: getExtractionStatus(text)
        });
      } catch {
        pages.push({
          id: `pdf-page-text-${pageNumber}`,
          drawingFileId: "",
          pageNumber,
          text: "",
          textLength: 0,
          extractionStatus: "failed"
        });
      }
    }

    await pdf.destroy?.();

    const status = getResultStatus(pages);

    return {
      fileName: file.name,
      pageCount: pdf.numPages,
      pages,
      status,
      message:
        status === "failed"
          ? "PDF 텍스트 추출에 실패했습니다. 다음 단계에서 이미지 기반 분석이 필요합니다."
          : "PDF 텍스트가 추출되었습니다. 다음 단계에서 페이지별 PNG 변환 및 도면 이미지 분석이 필요합니다."
    };
  } catch {
    return {
      fileName: file.name,
      pageCount: 0,
      pages: [],
      status: "failed",
      message: "PDF 텍스트 추출에 실패했습니다. 다음 단계에서 이미지 기반 분석이 필요합니다."
    };
  }
}
