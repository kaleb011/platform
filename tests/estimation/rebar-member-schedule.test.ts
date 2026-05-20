import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFutureReviewRebarCandidatesFromPdfResults,
  buildRebarQuantityCandidatesFromMemberSchedules,
  extractRebarMemberScheduleFromText
} from "@/lib/estimation/rebar-member-schedule";
import type {
  DrawingSheetIndexRecord,
  PdfTextExtractionResult,
  RebarMemberType
} from "@/lib/estimation/types";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture(name: string) {
  return readFileSync(path.join(fixtureDir, name), "utf8");
}

function parseCandidates(
  fixtureName: string,
  sheetType: DrawingSheetIndexRecord["sheetType"] = "structural_schedule"
) {
  const schedules = parseSchedules(fixtureName, sheetType);

  return buildRebarQuantityCandidatesFromMemberSchedules(schedules, fixtureName);
}

function parseSchedules(
  fixtureName: string,
  sheetType: DrawingSheetIndexRecord["sheetType"] = "structural_schedule"
) {
  return extractRebarMemberScheduleFromText(loadFixture(fixtureName), {
    fileName: fixtureName,
    sheetType
  });
}

function parseFutureReviewCandidates(fixtureName: string) {
  const text = loadFixture(fixtureName);
  const pdfResult: PdfTextExtractionResult = {
    fileName: fixtureName,
    pageCount: 1,
    status: "success",
    pages: [
      {
        id: `${fixtureName}-page-1`,
        drawingFileId: fixtureName,
        pageNumber: 1,
        text,
        textLength: text.length,
        extractionStatus: "success"
      }
    ]
  };
  const sheet: DrawingSheetIndexRecord = {
    id: `${fixtureName}-sheet-1`,
    sourcePage: 1,
    sourceFileName: fixtureName,
    discipline: "rebar_concrete",
    sheetType: "structural_schedule",
    detectedKeywords: [],
    quantityReadinessStatus: "schedule_based_calculation",
    quantityReadinessReason: "Fixture text parse helper",
    relatedSheetIds: [],
    confidence: 0.9,
    sourceTextSnippet: text.slice(0, 320)
  };

  return buildFutureReviewRebarCandidatesFromPdfResults([pdfResult], [sheet]);
}

function hasCandidate(
  candidates: ReturnType<typeof parseCandidates>,
  memberName: string,
  diameter: string,
  memberType: RebarMemberType
) {
  return candidates.some(
    (candidate) =>
      candidate.memberName === memberName &&
      candidate.diameter === diameter &&
      candidate.memberType === memberType
  );
}

function countByMemberType(candidates: ReturnType<typeof parseCandidates>, memberType: RebarMemberType) {
  return candidates.filter((candidate) => candidate.memberType === memberType).length;
}

function hasSchedule(
  schedules: ReturnType<typeof parseSchedules>,
  memberName: string,
  memberType: RebarMemberType
) {
  return schedules.some(
    (schedule) => schedule.memberName === memberName && schedule.memberType === memberType
  );
}

describe("rebar member schedule parsing", () => {
  it("creates column candidates from a vertical column schedule", () => {
    const candidates = parseCandidates("column-vertical-schedule.txt");

    expect(hasCandidate(candidates, "NPC1", "D19", "column")).toBe(true);
    expect(hasCandidate(candidates, "NPC1", "D10", "column")).toBe(true);
    expect(candidates.some((candidate) => /^(?:BP|NSC)/.test(candidate.memberName ?? ""))).toBe(false);
  });

  it("separates RC slab, deck slab, and following beam schedules", () => {
    const candidates = parseCandidates("slab-deck-beam-schedule.txt");

    expect(hasCandidate(candidates, "1NS1", "D13", "slab")).toBe(true);
    expect(
      candidates.some((candidate) => candidate.memberName === "DS1" && candidate.memberType === "slab")
    ).toBe(false);
    expect(hasCandidate(candidates, "1NFG1", "D22", "beam")).toBe(true);
  });

  it("keeps baseplate text out of foundation candidates", () => {
    const candidates = parseCandidates("foundation-baseplate-schedule.txt");

    expect(hasCandidate(candidates, "NF1", "D19", "footing")).toBe(true);
    expect(hasCandidate(candidates, "NF2", "D19", "footing")).toBe(true);
    expect(candidates.some((candidate) => /^(?:BP|NSC)/.test(candidate.memberName ?? ""))).toBe(false);
  });

  it("classifies NMF1 as a slab inside an RC slab schedule", () => {
    const candidates = parseCandidates("nmf-slab-schedule.txt");

    expect(hasCandidate(candidates, "1NS1", "D13", "slab")).toBe(true);
    expect(
      candidates.some((candidate) => candidate.memberName === "NMF1" && candidate.memberType === "slab")
    ).toBe(true);
  });

  it("does not create wall schedule candidates without a wall schedule", () => {
    const candidates = parseCandidates("wall-plan-no-schedule.txt", "structural_plan");

    expect(candidates.filter((candidate) => candidate.memberType === "wall")).toHaveLength(0);
  });

  it("keeps foundation candidates when baseplate text appears on the same page", () => {
    const candidates = parseCandidates("foundation-count-with-baseplate.txt");

    expect(countByMemberType(candidates, "footing")).toBeGreaterThanOrEqual(2);
    expect(candidates.some((candidate) => /^(?:BP|NSC)/.test(candidate.memberName ?? ""))).toBe(false);
  });

  it("keeps slab candidates when deck slab text appears on the same page", () => {
    const candidates = parseCandidates("slab-count-with-deck.txt");

    expect(countByMemberType(candidates, "slab")).toBeGreaterThanOrEqual(2);
    expect(
      candidates.some((candidate) => /^(?:DS|SD)/.test(candidate.memberName ?? "") && candidate.memberType === "slab")
    ).toBe(false);
  });

  it("continues scanning RC schedules after a deck slab block", () => {
    const candidates = parseCandidates("deck-then-foundation-schedule.txt");

    expect(hasCandidate(candidates, "1NS1", "D13", "slab")).toBe(true);
    expect(hasCandidate(candidates, "NF1", "D19", "footing")).toBe(true);
  });

  it("keeps UI tab-like candidate counts for default RC schedule members", () => {
    const candidates = parseCandidates("ui-tab-count-like-schedule.txt");

    expect(countByMemberType(candidates, "footing")).toBeGreaterThan(0);
    expect(countByMemberType(candidates, "slab")).toBeGreaterThan(0);
    expect(countByMemberType(candidates, "beam")).toBeGreaterThan(0);
    expect(countByMemberType(candidates, "column")).toBeGreaterThan(0);
    expect(countByMemberType(candidates, "wall")).toBe(0);
  });

  it("detects Gyeryong short beam schedules without pulling steel beam rows into RC", () => {
    const schedules = parseSchedules("gyeryong-beam-short-title.txt");

    expect(schedules.some((schedule) => schedule.memberName === "B3.85A" && schedule.memberType === "beam")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "B5.7A" && schedule.memberType === "beam")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "G7.5A" && schedule.memberType === "beam")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "LB1" && schedule.memberType === "beam")).toBe(true);
    expect(schedules.some((schedule) => /^(?:SB|SG)/.test(schedule.memberName))).toBe(false);
  });

  it("detects mixed foundation, column, and slab titles without an RC prefix", () => {
    const candidates = parseCandidates("gyeryong-foundation-column-slab-title.txt");

    expect(hasCandidate(candidates, "F1", "D19", "footing")).toBe(true);
    expect(hasCandidate(candidates, "C1", "D22", "column")).toBe(true);
    expect(hasCandidate(candidates, "C1", "D10", "column")).toBe(true);
    expect(hasCandidate(candidates, "S1", "D13", "slab")).toBe(true);
  });

  it("separates wall schedules and stair follow-up candidates", () => {
    const schedules = parseSchedules("gyeryong-wall-stair-title.txt");
    const futureReviewCandidates = parseFutureReviewCandidates("gyeryong-wall-stair-title.txt");

    expect(schedules.some((schedule) => schedule.memberName === "RW1" && schedule.memberType === "wall")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "RW2" && schedule.memberType === "wall")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "ST1")).toBe(false);
    expect(
      futureReviewCandidates.some(
        (candidate) =>
          candidate.memberName === "ST1" &&
          candidate.memberType === "unknown" &&
          candidate.memberListSource === "future_review" &&
          /계단 배근도 기반 후보/.test(candidate.note ?? "")
      )
    ).toBe(true);
  });

  it("keeps RC roof schedules while excluding steel column and base plate rows", () => {
    const schedules = parseSchedules("gyeryong-roof-schedule-mixed.txt");

    expect(schedules.some((schedule) => schedule.memberName === "S1" && schedule.memberType === "slab")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "S2" && schedule.memberType === "slab")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "C1" && schedule.memberType === "column")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "C2" && schedule.memberType === "column")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "SC1")).toBe(false);
    expect(schedules.some((schedule) => schedule.memberName === "B8.5B" && schedule.memberType === "beam")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "G7.5A" && schedule.memberType === "beam")).toBe(true);
    expect(schedules.some((schedule) => schedule.memberName === "BP1")).toBe(false);
  });

  it("parses mixed hanyang and gyeryong schedule corpus without losing RC candidates", () => {
    const fixtureName = "corpus-mixed-hanyang-gyeryong-schedules.txt";
    const schedules = parseSchedules(fixtureName);
    const candidates = parseCandidates(fixtureName);

    expect(countByMemberType(candidates, "beam")).toBeGreaterThan(0);
    expect(countByMemberType(candidates, "column")).toBeGreaterThan(0);
    expect(countByMemberType(candidates, "footing")).toBeGreaterThan(0);
    expect(countByMemberType(candidates, "slab")).toBeGreaterThan(0);
    expect(countByMemberType(candidates, "wall")).toBeGreaterThanOrEqual(0);

    expect(hasCandidate(candidates, "1NFG1", "D22", "beam")).toBe(true);
    expect(hasCandidate(candidates, "NPC1", "D19", "column")).toBe(true);
    expect(candidates.some((candidate) => /^NF/.test(candidate.memberName ?? "") && candidate.memberType === "footing")).toBe(true);
    expect(candidates.some((candidate) => /^(?:1NS|NMF)/.test(candidate.memberName ?? "") && candidate.memberType === "slab")).toBe(true);

    expect(hasSchedule(schedules, "B3.85A", "beam") || hasSchedule(schedules, "G7.5A", "beam")).toBe(true);
    expect(hasCandidate(candidates, "C1", "D22", "column")).toBe(true);
    expect(hasCandidate(candidates, "S1", "D13", "slab") || hasSchedule(schedules, "S2", "slab")).toBe(true);
    expect(hasSchedule(schedules, "RW1", "wall")).toBe(true);

    expect(schedules.some((schedule) => /^(?:SB|SG|HB|SCG|SMTG|STB|BP|BPL)/.test(schedule.memberName))).toBe(false);
    expect(
      candidates.some((candidate) =>
        /^(?:SB|SG|HB|SCG|SMTG|STB|BP|BPL)/.test(candidate.memberName ?? "")
      )
    ).toBe(false);
  });
});
