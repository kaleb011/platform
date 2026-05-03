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

type PdfJsDocumentSource = {
  data: Uint8Array;
  disableWorker?: boolean;
};

type PdfJsModuleLike = {
  getDocument: (source: PdfJsDocumentSource) => PdfLoadingTaskLike;
};

const FAILURE_MESSAGE =
  "PDF 텍스트 추출에 실패했습니다. 다음 단계에서 이미지 기반 분석이 필요합니다.";
const SUCCESS_MESSAGE =
  "PDF 텍스트가 추출되었습니다. 다음 단계에서 페이지별 PNG 변환 및 도면 이미지 분석이 필요합니다.";
const PAGE_TEXT_FAILURE_MESSAGE =
  "PDF 페이지 수는 확인했지만 페이지 텍스트 추출에 실패했습니다. 다음 단계에서 이미지 기반 분석이 필요합니다.";

function toDebugMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

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

function getResultMessage(args: {
  status: PdfTextExtractionResult["status"];
  pageCount: number;
}): string {
  if (args.pageCount <= 0) {
    return FAILURE_MESSAGE;
  }

  if (args.status === "failed") {
    return PAGE_TEXT_FAILURE_MESSAGE;
  }

  return SUCCESS_MESSAGE;
}

async function loadPdfDocument(
  pdfjs: PdfJsModuleLike,
  data: Uint8Array
): Promise<{ pdf: PdfDocumentProxyLike; debugSteps: string[] }> {
  const debugSteps: string[] = [];

  // TODO: Worker disabled for Vercel build stability. Large PDFs may parse slower until
  // a module-safe worker delivery strategy is added.
  console.debug("[estimate/pdf] getDocument start", { mode: "disableWorker" });
  const loadingTask = pdfjs.getDocument({ data: data.slice(), disableWorker: true });
  const pdf = await loadingTask.promise;
  debugSteps.push(`getDocument success with disableWorker, numPages=${pdf.numPages}`);
  console.debug("[estimate/pdf] getDocument success", {
    mode: "disableWorker",
    numPages: pdf.numPages
  });

  return { pdf, debugSteps };
}

export async function extractPdfTextFromFile(file: File): Promise<PdfTextExtractionResult> {
  const debugSteps: string[] = [
    `file=${file.name}`,
    `fileSize=${file.size}`,
    `mimeType=${file.type || "unknown"}`
  ];

  console.debug("[estimate/pdf] extraction start", {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type
  });

  let data: Uint8Array;

  try {
    const arrayBuffer = await file.arrayBuffer();
    data = new Uint8Array(arrayBuffer);
    debugSteps.push(`arrayBuffer success, bytes=${data.byteLength}`);
    console.debug("[estimate/pdf] arrayBuffer success", { bytes: data.byteLength });
  } catch (error) {
    const debugMessage = `arrayBuffer failed: ${toDebugMessage(error)}`;
    console.error("[estimate/pdf]", debugMessage, error);

    return {
      fileName: file.name,
      pageCount: 0,
      pages: [],
      status: "failed",
      message: FAILURE_MESSAGE,
      debugMessage: [...debugSteps, debugMessage].join(" | ")
    };
  }

  let pdfjs: PdfJsModuleLike;

  try {
    pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJsModuleLike;
    debugSteps.push("pdfjs dynamic import success");
    console.debug("[estimate/pdf] pdfjs dynamic import success");
  } catch (error) {
    const debugMessage = `pdfjs dynamic import failed: ${toDebugMessage(error)}`;
    console.error("[estimate/pdf]", debugMessage, error);

    return {
      fileName: file.name,
      pageCount: 0,
      pages: [],
      status: "failed",
      message: FAILURE_MESSAGE,
      debugMessage: [...debugSteps, debugMessage].join(" | ")
    };
  }

  let pdf: PdfDocumentProxyLike;

  try {
    const loaded = await loadPdfDocument(pdfjs, data);
    pdf = loaded.pdf;
    debugSteps.push(...loaded.debugSteps);
  } catch (error) {
    const debugMessage = `getDocument failed: ${toDebugMessage(error)}`;
    console.error("[estimate/pdf]", debugMessage, error);

    return {
      fileName: file.name,
      pageCount: 0,
      pages: [],
      status: "failed",
      message: FAILURE_MESSAGE,
      debugMessage: [...debugSteps, debugMessage].join(" | ")
    };
  }

  const pageCount = Number.isFinite(pdf.numPages) ? pdf.numPages : 0;
  debugSteps.push(`numPages=${pageCount}`);
  console.debug("[estimate/pdf] numPages confirmed", { numPages: pageCount });

  if (pageCount <= 0) {
    const debugMessage = "getDocument returned an invalid page count";
    console.error("[estimate/pdf]", debugMessage, { numPages: pdf.numPages });
    await pdf.destroy?.();

    return {
      fileName: file.name,
      pageCount: 0,
      pages: [],
      status: "failed",
      message: FAILURE_MESSAGE,
      debugMessage: [...debugSteps, debugMessage].join(" | ")
    };
  }

  const pages: PdfPageTextRecord[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
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

      if (pageNumber <= 3 || pageNumber === pageCount) {
        console.debug("[estimate/pdf] page text extracted", {
          pageNumber,
          textLength: text.length,
          status: getExtractionStatus(text)
        });
      }
    } catch (error) {
      const pageDebug = `page ${pageNumber} text extraction failed: ${toDebugMessage(error)}`;
      debugSteps.push(pageDebug);
      console.error("[estimate/pdf]", pageDebug, error);
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
  const successCount = pages.filter((page) => page.extractionStatus === "success").length;
  const emptyCount = pages.filter((page) => page.extractionStatus === "empty").length;
  const failedCount = pages.filter((page) => page.extractionStatus === "failed").length;
  debugSteps.push(
    `pageTextSummary success=${successCount}, empty=${emptyCount}, failed=${failedCount}`
  );

  console.debug("[estimate/pdf] extraction complete", {
    fileName: file.name,
    pageCount,
    status,
    successCount,
    emptyCount,
    failedCount
  });

  return {
    fileName: file.name,
    pageCount,
    pages,
    status,
    message: getResultMessage({ status, pageCount }),
    debugMessage: debugSteps.join(" | ")
  };
}
