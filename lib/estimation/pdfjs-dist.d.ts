declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export const getDocument: (source: {
    data: Uint8Array;
    disableWorker?: boolean;
  }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str?: string }>;
        }>;
      }>;
      destroy?: () => Promise<void> | void;
    }>;
  };
}
