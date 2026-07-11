import { describe, expect, it } from "vitest";

import { extractNormalizedInput } from "./input";

describe("extractNormalizedInput", () => {
  it("prefers stable intent payload over opaque ids", () => {
    const input = extractNormalizedInput({
      id: "1",
      waId: "237695606060",
      type: "button",
      buttonReply: { payload: "intent_order", text: "Commander" },
    });
    expect(input).toMatchObject({ kind: "button", value: "intent_order" });
  });

  it("uses button label when WATI payload is opaque", () => {
    const input = extractNormalizedInput({
      id: "2",
      waId: "237695606060",
      type: "button",
      buttonReply: { payload: "a1b2c3d4e5", text: "Commander" },
    });
    expect(input).toMatchObject({ kind: "button", value: "Commander" });
  });

  it("uses interactive label when id is opaque", () => {
    const input = extractNormalizedInput({
      id: "3",
      waId: "237695606060",
      type: "interactive",
      interactiveButtonReply: { id: "xyz-opaque", title: "Réserver" },
    });
    expect(input).toMatchObject({ kind: "button", value: "Réserver" });
  });
});
