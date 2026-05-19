import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRebarQuantityCandidatesFromMemberSchedules,
  extractRebarMemberScheduleFromText
} from "@/lib/estimation/rebar-member-schedule";
import type { DrawingSheetIndexRecord, RebarMemberType } from "@/lib/estimation/types";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture(name: string) {
  return readFileSync(path.join(fixtureDir, name), "utf8");
}

function parseCandidates(
  fixtureName: string,
  sheetType: DrawingSheetIndexRecord["sheetType"] = "structural_schedule"
) {
  const schedules = extractRebarMemberScheduleFromText(loadFixture(fixtureName), {
    fileName: fixtureName,
    sheetType
  });

  return buildRebarQuantityCandidatesFromMemberSchedules(schedules, fixtureName);
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

describe("rebar member schedule parsing", () => {
  it("creates column candidates from a vertical column schedule", () => {
    const candidates = parseCandidates("column-vertical-schedule.txt");

    expect(hasCandidate(candidates, "NPC1", "D19", "column")).toBe(true);
    expect(hasCandidate(candidates, "NPC1", "D10", "column")).toBe(true);
    expect(candidates.some((candidate) => /^(?:BP|NSC)/.test(candidate.memberName))).toBe(false);
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
    expect(candidates.some((candidate) => /^(?:BP|NSC)/.test(candidate.memberName))).toBe(false);
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
    expect(candidates.some((candidate) => /^(?:BP|NSC)/.test(candidate.memberName))).toBe(false);
  });

  it("keeps slab candidates when deck slab text appears on the same page", () => {
    const candidates = parseCandidates("slab-count-with-deck.txt");

    expect(countByMemberType(candidates, "slab")).toBeGreaterThanOrEqual(2);
    expect(
      candidates.some((candidate) => /^(?:DS|SD)/.test(candidate.memberName) && candidate.memberType === "slab")
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
});
