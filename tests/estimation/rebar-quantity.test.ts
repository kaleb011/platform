import { describe, expect, it } from "vitest";

import {
  getEffectiveRebarRole,
  getMissingRebarRequiredInputLabels,
  recalculateRebarQuantityCandidate
} from "@/lib/estimation/rebar-quantity";
import type { RebarQuantityCandidateRecord } from "@/lib/estimation/types";

function createBeamStirrupCandidate(
  overrides: Partial<RebarQuantityCandidateRecord> = {}
): RebarQuantityCandidateRecord {
  return {
    id: "beam-stirrup-test",
    memberName: "G1",
    memberType: "beam",
    position: "stirrup",
    workCategory: "철근콘크리트공사",
    itemName: "철근 가공 및 조립",
    specification: "D10 / 보 / G1",
    diameter: "D10",
    unitWeightKgPerM: 0.56,
    memberLengthMm: 6000,
    sectionWidthMm: 400,
    sectionDepthMm: 600,
    coverMm: 40,
    hookLengthMm: 0,
    bendCorrectionMm: 0,
    lossRate: 0.03,
    faceCount: 1,
    barCountRule: "ceil_plus_one",
    memberCount: 1,
    quantityKg: 0,
    quantityTon: 0,
    materialQuantityKg: 0,
    materialQuantityTon: 0,
    unit: "kg",
    calculationFormula: "",
    calculationBasis: "",
    confidence: 1,
    reviewStatus: "pending",
    quantityReviewRequired: true,
    ...overrides
  };
}

function createBeamMainCandidate(
  overrides: Partial<RebarQuantityCandidateRecord> = {}
): RebarQuantityCandidateRecord {
  return createBeamStirrupCandidate({
    id: "beam-main-test",
    position: "main",
    rebarRole: "main",
    diameter: "D22",
    unitWeightKgPerM: 3.04,
    memberLengthMm: 2750,
    sectionWidthMm: undefined,
    sectionDepthMm: undefined,
    spacingMm: undefined,
    manualBarCount: 5,
    barCount: undefined,
    ...overrides
  });
}

describe("recalculateRebarQuantityCandidate beam role switching", () => {
  it("calculates beam main bars without stirrup spacing", () => {
    const result = recalculateRebarQuantityCandidate(createBeamMainCandidate());

    expect(getEffectiveRebarRole(result)).toBe("main");
    expect(result.quantityReviewRequired).toBe(false);
    expect(result.singleBarLengthM).toBe(2.75);
    expect(result.quantityKg).toBeGreaterThan(0);
    expect(getMissingRebarRequiredInputLabels(result)).not.toContain("철근 개수 또는 늑근 간격");
  });

  it("calculates beam main bars without beam width and depth", () => {
    const result = recalculateRebarQuantityCandidate(
      createBeamMainCandidate({
        sectionWidthMm: undefined,
        sectionDepthMm: undefined
      })
    );

    expect(result.quantityReviewRequired).toBe(false);
    expect(getMissingRebarRequiredInputLabels(result)).not.toContain("보 폭");
    expect(getMissingRebarRequiredInputLabels(result)).not.toContain("보 춤");
  });

  it("calculates beam stirrups without direct bar count", () => {
    const result = recalculateRebarQuantityCandidate(
      createBeamStirrupCandidate({
        beamStirrupCalculationMode: "single_spacing",
        memberLengthMm: 2750,
        spacingMm: 200,
        manualBarCount: undefined,
        barCount: undefined
      })
    );

    expect(getEffectiveRebarRole(result)).toBe("stirrup");
    expect(result.barCount).toBe(15);
    expect(result.quantityReviewRequired).toBe(false);
    expect(getMissingRebarRequiredInputLabels(result)).not.toContain("직접 본수");
  });

  it("uses user-selected main role before parsed stirrup-looking text", () => {
    const result = recalculateRebarQuantityCandidate(
      createBeamMainCandidate({
        rawText: "D10@200",
        sourceTextSnippet: "D10@200 늑근",
        spacingMm: undefined
      })
    );

    expect(getEffectiveRebarRole(result)).toBe("main");
    expect(result.position).toBe("main");
    expect(result.singleBarLengthM).toBe(2.75);
    expect(result.calculationFormula).toContain("현재 산출 모드: 보 주근");
    expect(result.quantityReviewRequired).toBe(false);
  });
});

describe("recalculateRebarQuantityCandidate beam stirrup segmented spacing", () => {
  it("calculates left, center, right stirrup counts with ratio end zones", () => {
    const result = recalculateRebarQuantityCandidate(
      createBeamStirrupCandidate({
        beamStirrupCalculationMode: "segmented_spacing",
        beamStirrupEndZoneMode: "ratio",
        beamStirrupEndZoneRatio: 0.25,
        beamStirrupLeftSpacingMm: 100,
        beamStirrupCenterSpacingMm: 200,
        beamStirrupRightSpacingMm: 100
      })
    );

    expect(result.beamStirrupLeftEndLengthMm).toBe(1500);
    expect(result.beamStirrupRightEndLengthMm).toBe(1500);
    expect(result.beamStirrupCenterLengthMm).toBe(3000);
    expect(result.beamStirrupLeftCount).toBe(16);
    expect(result.beamStirrupCenterCount).toBe(15);
    expect(result.beamStirrupRightCount).toBe(16);
    expect(result.beamStirrupTotalCount).toBe(47);
    expect(result.quantityKg).toBeGreaterThan(0);
    expect(result.materialQuantityKg ?? 0).toBeGreaterThan(result.quantityKg);
    expect(result.quantityReviewRequired).toBe(false);
  });

  it("uses manual end-zone lengths when selected", () => {
    const result = recalculateRebarQuantityCandidate(
      createBeamStirrupCandidate({
        beamStirrupCalculationMode: "segmented_spacing",
        beamStirrupEndZoneMode: "manual",
        beamStirrupLeftEndLengthMm: 1200,
        beamStirrupRightEndLengthMm: 1800,
        beamStirrupLeftSpacingMm: 100,
        beamStirrupCenterSpacingMm: 200,
        beamStirrupRightSpacingMm: 150
      })
    );

    expect(result.beamStirrupLeftEndLengthMm).toBe(1200);
    expect(result.beamStirrupRightEndLengthMm).toBe(1800);
    expect(result.beamStirrupCenterLengthMm).toBe(3000);
    expect(result.beamStirrupLeftCount).toBe(13);
    expect(result.beamStirrupCenterCount).toBe(15);
    expect(result.beamStirrupRightCount).toBe(13);
  });

  it("uses two-depth end zones when selected", () => {
    const result = recalculateRebarQuantityCandidate(
      createBeamStirrupCandidate({
        beamStirrupCalculationMode: "segmented_spacing",
        beamStirrupEndZoneMode: "two_depth",
        beamStirrupLeftSpacingMm: 100,
        beamStirrupCenterSpacingMm: 200,
        beamStirrupRightSpacingMm: 100
      })
    );

    expect(result.beamStirrupLeftEndLengthMm).toBe(1200);
    expect(result.beamStirrupRightEndLengthMm).toBe(1200);
    expect(result.beamStirrupCenterLengthMm).toBe(3600);
  });

  it("marks quantity review required when end zones exceed beam length", () => {
    const result = recalculateRebarQuantityCandidate(
      createBeamStirrupCandidate({
        beamStirrupCalculationMode: "segmented_spacing",
        beamStirrupEndZoneMode: "manual",
        beamStirrupLeftEndLengthMm: 4000,
        beamStirrupRightEndLengthMm: 3000,
        beamStirrupLeftSpacingMm: 100,
        beamStirrupCenterSpacingMm: 200,
        beamStirrupRightSpacingMm: 100
      })
    );

    expect(result.quantityReviewRequired).toBe(true);
    expect(result.calculationBasis).toContain("구간 길이 검토 필요");
  });

  it("keeps existing single-spacing stirrup calculation compatible", () => {
    const result = recalculateRebarQuantityCandidate(
      createBeamStirrupCandidate({
        beamStirrupCalculationMode: "single_spacing",
        spacingMm: 200
      })
    );

    expect(result.barCount).toBe(31);
    expect(result.beamStirrupTotalCount).toBeUndefined();
    expect(result.quantityReviewRequired).toBe(false);
  });
});
