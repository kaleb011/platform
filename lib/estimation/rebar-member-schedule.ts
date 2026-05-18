import {
  getRebarUnitWeight,
  normalizeRebarDiameter,
  parseRebarCountPattern,
  parseRebarSpacingPattern,
  parseSectionSize,
  recalculateRebarQuantityCandidate
} from "@/lib/estimation/rebar-quantity";
import type {
  DrawingSheetIndexRecord,
  PdfTextExtractionResult,
  RebarMemberScheduleRecord,
  RebarMemberType,
  RebarPlanReferenceRecord,
  RebarPosition,
  RebarQuantityCandidateRecord
} from "@/lib/estimation/types";

const scheduleTitlePattern =
  /구조일람표|슬라브\s*일람표|슬래브\s*일람표|보\s*일람표|기둥\s*일람표|기초\s*일람표|베이스플레이트|STRUCTURAL SCHEDULE|BEAM SCHEDULE|COLUMN SCHEDULE|FOOTING SCHEDULE|SLAB SCHEDULE/i;
const planTitlePattern = /구조평면도|FOUNDATION PLAN|FRAMING PLAN|SLAB PLAN|STRUCTURAL PLAN/i;
const notePattern =
  /구조\s*일반사항|GENERAL NOTE|NOTE|정착|이음|갈고리|피복|SD400|SD500|fy|fck|표준갈고리|A급\s*이음|B급\s*이음|철근\s*순간격|설계기준강도/i;
const memberNamePattern =
  /\b(?:\d{0,2}(?:NFG|NMF|NPC|NS|DS|RW|NF|FG|PC|G|B|C|F|W)[A-Z]?\d{1,3}[A-Z]?|[A-Z]{1,3}\d{1,3}[A-Z]?)\b/g;

function normalizeText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeMemberName(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function createStableId(parts: Array<string | number | undefined>) {
  let hash = 0;
  const source = parts.filter(Boolean).join("|");

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `schedule-member-${hash.toString(36)}`;
}

function findSheet(
  drawingIndexes: DrawingSheetIndexRecord[] | undefined,
  sourceFileName: string,
  sourcePage: number
) {
  return drawingIndexes?.find(
    (sheet) =>
      sheet.sourcePage === sourcePage &&
      (!sheet.sourceFileName || sheet.sourceFileName === sourceFileName)
  );
}

function isSchedulePage(text: string, sheet?: DrawingSheetIndexRecord) {
  const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${text}`;

  return (
    /\bS-30[1-3]\b/i.test(source) ||
    sheet?.sheetType === "structural_schedule" ||
    scheduleTitlePattern.test(source)
  );
}

function isPlanPage(text: string, sheet?: DrawingSheetIndexRecord) {
  const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${text}`;

  return (
    /\bS-22[1-5]\b/i.test(source) ||
    sheet?.sheetType === "structural_plan" ||
    planTitlePattern.test(source)
  );
}

function inferMemberType(memberName: string, source: string): RebarMemberType {
  const member = normalizeMemberName(memberName);

  if (/\bS-301\b/i.test(source) || /슬라브|슬래브|SLAB/i.test(source)) {
    if (/^(?:\d{0,2}NS|DS|S)\d/i.test(member)) return "slab";
  }

  if (/\bS-302\b/i.test(source) || /보\s*일람표|BEAM/i.test(source)) {
    if (/(?:NFG|FG|G|B)\d/i.test(member)) return "beam";
  }

  if (/\bS-302\b/i.test(source) || /기둥\s*일람표|COLUMN/i.test(source)) {
    if (/(?:NPC|PC|C)\d/i.test(member)) return "column";
  }

  if (/\bS-303\b/i.test(source) || /기초|베이스|FOOTING|BASE/i.test(source)) {
    if (/(?:NMF|NF|F)\d/i.test(member)) return "footing";
  }

  if (/^(?:RW|W)\d/i.test(member) || /벽체|WALL/i.test(source)) return "wall";
  if (/(?:NFG|FG|G|B)\d/i.test(member)) return "beam";
  if (/(?:NPC|PC|C)\d/i.test(member)) return "column";
  if (/^(?:\d{0,2}NS|DS|S)\d/i.test(member)) return "slab";
  if (/(?:NMF|NF|F)\d/i.test(member)) return "footing";

  return "unknown";
}

function getContextWindow(lines: string[], index: number) {
  return normalizeText(lines.slice(Math.max(0, index - 1), index + 2).join(" "));
}

function getDetectedSpecs(text: string) {
  const specs = new Set<string>();

  parseRebarCountPattern(text).forEach((pattern) => specs.add(pattern.rawText.replace(/\s+/g, "")));
  parseRebarSpacingPattern(text).forEach((pattern) => specs.add(pattern.rawText.replace(/\s+/g, "")));

  return Array.from(specs);
}

function getPositionFromSpec(spec: string, memberType: RebarMemberType): RebarPosition {
  if (memberType === "beam" && /@/.test(spec)) return "stirrup";
  if (memberType === "column" && /@/.test(spec)) return "tie";
  if (memberType === "footing") return "x";
  if (memberType === "slab") return "x_bottom";
  if (memberType === "wall") return "vertical";

  return "main";
}

function mergeScheduleRecord(
  current: RebarMemberScheduleRecord | undefined,
  next: RebarMemberScheduleRecord
) {
  if (!current) return next;

  return {
    ...current,
    detectedSpecs: Array.from(new Set([...current.detectedSpecs, ...next.detectedSpecs])),
    mainBars: Array.from(new Set([...(current.mainBars ?? []), ...(next.mainBars ?? [])])),
    stirrups: Array.from(new Set([...(current.stirrups ?? []), ...(next.stirrups ?? [])])),
    spacingSpecs: Array.from(new Set([...(current.spacingSpecs ?? []), ...(next.spacingSpecs ?? [])])),
    sourceTextSnippet: [current.sourceTextSnippet, next.sourceTextSnippet]
      .filter(Boolean)
      .join(" ")
      .slice(0, 320),
    confidence: Math.max(current.confidence, next.confidence)
  };
}

export function extractRebarMemberScheduleFromPdfResults(
  pdfResults: PdfTextExtractionResult[],
  drawingIndexes: DrawingSheetIndexRecord[] = []
): RebarMemberScheduleRecord[] {
  const scheduleMap = new Map<string, RebarMemberScheduleRecord>();
  const planReferences = new Map<string, RebarPlanReferenceRecord[]>();

  pdfResults.forEach((result) => {
    result.pages.forEach((page) => {
      const sheet = findSheet(drawingIndexes, result.fileName, page.pageNumber);
      const text = page.text ?? "";
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (isSchedulePage(text, sheet)) {
        lines.forEach((line, index) => {
          const context = getContextWindow(lines, index);
          const detectedSpecs = getDetectedSpecs(context);

          if (detectedSpecs.length === 0) return;

          const memberNames = Array.from(context.matchAll(memberNamePattern))
            .map((match) => normalizeMemberName(match[0]))
            .filter((name) => !/^(?:D|HD|SD|FCK|FY)\d/i.test(name));

          memberNames.forEach((memberName) => {
            const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${context}`;
            const memberType = inferMemberType(memberName, source);

            if (memberType === "unknown") return;

            const section = parseSectionSize(context);
            const spacingSpecs = detectedSpecs.filter((spec) => spec.includes("@"));
            const countSpecs = detectedSpecs.filter((spec) => !spec.includes("@"));
            const record: RebarMemberScheduleRecord = {
              id: createStableId([result.fileName, page.pageNumber, memberName]),
              memberName,
              memberType,
              drawingNo: sheet?.drawingNo,
              drawingTitle: sheet?.drawingTitle,
              sourcePage: page.pageNumber,
              sourceType: "schedule",
              sectionName: sheet?.drawingTitle,
              detectedSpecs,
              sectionSize: section
                ? [section.widthMm, section.lengthMm ?? section.depthMm].filter(Boolean).join("x")
                : undefined,
              widthMm: section?.widthMm,
              depthMm: section?.depthMm,
              thicknessMm: memberType === "slab" ? section?.depthMm : undefined,
              mainBars: countSpecs,
              stirrups: spacingSpecs,
              spacingSpecs,
              sourceTextSnippet: context,
              confidence: sheet?.confidence ? Math.max(0.7, sheet.confidence) : 0.72
            };

            scheduleMap.set(memberName, mergeScheduleRecord(scheduleMap.get(memberName), record));
          });
        });
      } else if (isPlanPage(text, sheet)) {
        lines.forEach((line, index) => {
          const context = getContextWindow(lines, index);
          const memberNames = Array.from(context.matchAll(memberNamePattern)).map((match) =>
            normalizeMemberName(match[0])
          );

          memberNames.forEach((memberName) => {
            const reference: RebarPlanReferenceRecord = {
              drawingNo: sheet?.drawingNo,
              drawingTitle: sheet?.drawingTitle,
              sourcePage: page.pageNumber,
              sourceTextSnippet: context
            };

            planReferences.set(memberName, [...(planReferences.get(memberName) ?? []), reference]);
          });
        });
      }
    });
  });

  return Array.from(scheduleMap.values()).map((record) => {
    const references = planReferences.get(record.memberName) ?? [];

    return {
      ...record,
      sourceType: references.length > 0 ? "schedule_with_plan" : "schedule",
      planReferences: references
    };
  });
}

export function buildRebarQuantityCandidatesFromMemberSchedules(
  schedules: RebarMemberScheduleRecord[],
  sourceFileName?: string
): RebarQuantityCandidateRecord[] {
  const candidates = schedules.flatMap((schedule) => {
    if (
      schedule.memberType === "unknown" ||
      schedule.memberType === "wall" ||
      schedule.detectedSpecs.length === 0
    ) {
      return [];
    }

    return schedule.detectedSpecs.flatMap((spec, index) => {
      const countPattern = parseRebarCountPattern(spec)[0];
      const spacingPattern = parseRebarSpacingPattern(spec)[0];
      const diameter = normalizeRebarDiameter(
        countPattern?.diameter ?? spacingPattern?.diameter ?? spec
      );
      const unitWeightKgPerM = diameter ? getRebarUnitWeight(diameter) : null;

      if (!diameter || !unitWeightKgPerM) return [];

      const position = getPositionFromSpec(spec, schedule.memberType);
      const candidate: RebarQuantityCandidateRecord = {
        id: `${schedule.id}-${index}`,
        scheduleMemberId: schedule.id,
        sourceFileName,
        sourcePage: schedule.sourcePage,
        drawingNo: schedule.drawingNo,
        memberName: schedule.memberName,
        memberType: schedule.memberType,
        position,
        workCategory: "철근콘크리트공사",
        itemName: "철근 가공 및 조립",
        specification: [diameter, schedule.memberName, spec].join(" / "),
        diameter,
        unitWeightKgPerM,
        barCount: countPattern?.count,
        manualBarCount: countPattern?.count,
        spacingMm: spacingPattern?.spacingMm,
        sectionWidthMm: schedule.memberType === "beam" || schedule.memberType === "column" ? schedule.widthMm : undefined,
        sectionDepthMm:
          schedule.memberType === "beam" || schedule.memberType === "column"
            ? schedule.depthMm
            : schedule.thicknessMm,
        footingWidthMm: schedule.memberType === "footing" ? schedule.widthMm : undefined,
        footingLengthMm: schedule.memberType === "footing" ? schedule.depthMm : undefined,
        slabThicknessMm: schedule.memberType === "slab" ? schedule.thicknessMm : undefined,
        coverMm: schedule.memberType === "slab" ? 30 : 40,
        anchorageLengthMm: 0,
        spliceLengthMm: 0,
        hookLengthMm: 0,
        bendCorrectionMm: 0,
        lossRate: 0.03,
        faceCount: 1,
        barCountRule: "floor_plus_one",
        footingLayer: "top",
        memberCount: 1,
        quantityKg: 0,
        quantityTon: 0,
        materialQuantityKg: 0,
        materialQuantityTon: 0,
        unit: "kg",
        calculationFormula: "필수 입력값 부족",
        calculationBasis: "구조일람표 기반 부재 마스터에서 생성된 수량산출 후보입니다.",
        confidence: schedule.confidence,
        reviewStatus: "pending",
        quantityReviewRequired: true,
        note: "구조일람표 기반 후보",
        rawText: spec,
        sourceTextSnippet: schedule.sourceTextSnippet,
        rebarSourceType: "structural_schedule",
        scheduleSourcePage: schedule.sourcePage,
        scheduleDrawingNo: schedule.drawingNo,
        scheduleDrawingTitle: schedule.drawingTitle,
        planMatched: (schedule.planReferences?.length ?? 0) > 0,
        planReferencePages: schedule.planReferences
          ?.map((reference) => reference.sourcePage)
          .filter((page): page is number => typeof page === "number"),
        memberListSource:
          (schedule.planReferences?.length ?? 0) > 0 ? "schedule_with_plan" : "schedule",
        detectedSpecs: schedule.detectedSpecs
      };

      return [recalculateRebarQuantityCandidate(candidate)];
    });
  });

  return candidates;
}

export function buildPlanUnmatchedRebarCandidatesFromPdfResults(
  pdfResults: PdfTextExtractionResult[],
  drawingIndexes: DrawingSheetIndexRecord[] = [],
  schedules: RebarMemberScheduleRecord[] = []
): RebarQuantityCandidateRecord[] {
  const scheduleNames = new Set(schedules.map((schedule) => schedule.memberName));
  const seen = new Set<string>();
  const candidates: RebarQuantityCandidateRecord[] = [];

  pdfResults.forEach((result) => {
    result.pages.forEach((page) => {
      const sheet = findSheet(drawingIndexes, result.fileName, page.pageNumber);
      const text = page.text ?? "";

      if (!isPlanPage(text, sheet)) return;

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      lines.forEach((line, index) => {
        const context = getContextWindow(lines, index);
        const memberNames = Array.from(context.matchAll(memberNamePattern))
          .map((match) => normalizeMemberName(match[0]))
          .filter((name) => !scheduleNames.has(name));

        memberNames.forEach((memberName) => {
          const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${context}`;
          const memberType = inferMemberType(memberName, source);
          const key = `${result.fileName}|${page.pageNumber}|${memberName}`;

          if (seen.has(key) || memberType !== "wall") return;
          seen.add(key);

          const detectedSpecs = getDetectedSpecs(context);
          const firstSpec = detectedSpecs[0] ?? "D13";
          const spacingPattern = parseRebarSpacingPattern(firstSpec)[0];
          const diameter = normalizeRebarDiameter(spacingPattern?.diameter ?? firstSpec) ?? "D13";
          const unitWeightKgPerM = getRebarUnitWeight(diameter) ?? 0.995;
          const candidate: RebarQuantityCandidateRecord = {
            id: `plan-unmatched-${createStableId([result.fileName, page.pageNumber, memberName])}`,
            sourceFileName: result.fileName,
            sourcePage: page.pageNumber,
            drawingNo: sheet?.drawingNo,
            memberName,
            memberType,
            position: "vertical",
            workCategory: "철근콘크리트공사",
            itemName: "철근 가공 및 조립",
            specification: [diameter, memberName, "평면도 감지"].join(" / "),
            diameter,
            unitWeightKgPerM,
            spacingMm: spacingPattern?.spacingMm,
            sectionDepthMm: parseSectionSize(context)?.depthMm,
            wallThicknessMm: parseSectionSize(context)?.depthMm,
            coverMm: 40,
            anchorageLengthMm: 0,
            spliceLengthMm: 0,
            hookLengthMm: 0,
            bendCorrectionMm: 0,
            lossRate: 0.03,
            faceCount: 2,
            barCountRule: "floor_plus_one",
            memberCount: 1,
            quantityKg: 0,
            quantityTon: 0,
            materialQuantityKg: 0,
            materialQuantityTon: 0,
            unit: "kg",
            calculationFormula: "필수 입력값 부족",
            calculationBasis:
              "구조평면도에서 감지되었지만 구조일람표 마스터와 매칭되지 않은 후보입니다. 배근 상세 확인 필요.",
            confidence: sheet?.confidence ? Math.min(sheet.confidence, 0.55) : 0.45,
            reviewStatus: "pending",
            quantityReviewRequired: true,
            note: "평면도 감지 후보 / 일람표 매칭 필요",
            rawText: firstSpec,
            sourceTextSnippet: context,
            rebarSourceType: "structural_plan",
            planMatched: false,
            planReferencePages: [page.pageNumber],
            memberListSource: "plan_unmatched",
            detectedSpecs
          };

          candidates.push(recalculateRebarQuantityCandidate(candidate));
        });
      });
    });
  });

  return candidates;
}
