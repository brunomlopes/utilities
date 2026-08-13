import { describe, expect, it } from "vitest";
import { formatCompactJson } from "./compact-format";

describe("formatCompactJson", () => {
  it("recursively compacts singleton objects and arrays", () => {
    expect(
      formatCompactJson({
        Content: { Title: "Innovation Challenge Workflow" },
        Stages: [
          {
            Id: "1",
            Content: { Title: "Submission" },
            OnEnter: { Actions: [{ Id: "first" }, { Id: "second" }] },
            OnDurationElapsed: { Actions: [{ Id: "only" }] },
          },
        ],
      }),
    ).toBe(`{
  "Content": { "Title": "Innovation Challenge Workflow" },
  "Stages": [
    {
      "Id": "1",
      "Content": { "Title": "Submission" },
      "OnEnter": {
        "Actions": [
          { "Id": "first" },
          { "Id": "second" }
        ]
      },
      "OnDurationElapsed": { "Actions": [ { "Id": "only" } ] }
    }
  ]
}`);
  });

  it("expands a singleton chain when the complete line exceeds the available width", () => {
    expect(formatCompactJson({ wrapper: { value: "a long value" } }, 28)).toBe(`{
  "wrapper": {
    "value": "a long value"
  }
}`);
  });

  it("still compacts eligible descendants after an outer singleton exceeds the width", () => {
    expect(formatCompactJson({ wrapper: { value: "short" } }, 34)).toBe(`{
  "wrapper": { "value": "short" }
}`);
  });
});
