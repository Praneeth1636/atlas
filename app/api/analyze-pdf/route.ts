import { createRequire } from "node:module";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
const require = createRequire(import.meta.url);

type ParsedPdf = {
  info?: {
    Title?: string;
    Subject?: string;
  };
  numpages: number;
  text: string;
};

type PdfParseFn = (data: Buffer) => Promise<ParsedPdf>;

function isValidPdfUrl(value: string) {
  return /^https?:\/\//.test(value);
}

function isPdfMagicBytes(buffer: Buffer) {
  return buffer.toString("ascii", 0, 4) === "%PDF";
}

function createPdfResponse({
  parsedPdf,
  sourceRef,
  fileName,
  pdfUrl,
}: {
  parsedPdf: ParsedPdf;
  sourceRef: string;
  fileName?: string;
  pdfUrl?: string;
}) {
  const title = parsedPdf.info?.Title || fileName || "document.pdf";

  return {
    sourceType: "pdf" as const,
    sourceRef,
    metadata: {
      name: title,
      fullName: title,
      description: parsedPdf.info?.Subject ?? null,
      language: null,
      stars: 0,
      url: pdfUrl ?? "",
      pageCount: parsedPdf.numpages,
    },
    readme: (parsedPdf.text ?? "").slice(0, 12000),
    fileTree: [],
  };
}

async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdf> {
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as PdfParseFn;
  const parsedPdf = await pdfParse(buffer);

  return {
    info: parsedPdf.info,
    numpages: parsedPdf.numpages,
    text: parsedPdf.text,
  };
}

async function fetchPdfBuffer(pdfUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(pdfUrl, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Unexpected PDF fetch status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("application/pdf")) {
      return {
        error: NextResponse.json({ error: "Not a PDF" }, { status: 415 }),
      };
    }

    const contentLength = response.headers.get("content-length");

    if (contentLength && Number(contentLength) > MAX_PDF_SIZE_BYTES) {
      return {
        error: NextResponse.json({ error: "File too large" }, { status: 413 }),
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength > MAX_PDF_SIZE_BYTES) {
      return {
        error: NextResponse.json({ error: "File too large" }, { status: 413 }),
      };
    }

    if (!isPdfMagicBytes(buffer)) {
      return {
        error: NextResponse.json({ error: "Not a PDF" }, { status: 415 }),
      };
    }

    return { buffer };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.startsWith("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
      }

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: "Not a PDF" }, { status: 415 });
      }

      if (file.size > MAX_PDF_SIZE_BYTES) {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (!isPdfMagicBytes(buffer)) {
        return NextResponse.json({ error: "Not a PDF" }, { status: 415 });
      }

      const parsedPdf = await parsePdfBuffer(buffer);

      return NextResponse.json(
        createPdfResponse({
          parsedPdf,
          sourceRef: file.name,
          fileName: file.name,
        })
      );
    }

    const body = (await request.json()) as { pdfUrl?: string };
    const pdfUrl = body.pdfUrl?.trim() ?? "";

    if (!pdfUrl) {
      return NextResponse.json({ error: "Missing PDF URL" }, { status: 400 });
    }

    if (!isValidPdfUrl(pdfUrl)) {
      return NextResponse.json({ error: "Invalid PDF URL" }, { status: 400 });
    }

    const fetchedPdf = await fetchPdfBuffer(pdfUrl);

    if ("error" in fetchedPdf) {
      return fetchedPdf.error;
    }

    const parsedPdf = await parsePdfBuffer(fetchedPdf.buffer);

    return NextResponse.json(
      createPdfResponse({
        parsedPdf,
        sourceRef: pdfUrl,
        pdfUrl,
      })
    );
  } catch (error) {
    console.error("[analyze-pdf]", error);

    return NextResponse.json(
      { error: "Failed to analyze PDF" },
      { status: 500 }
    );
  }
}
