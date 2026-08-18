import { describe, expect, it } from "vitest";
import { FilterSyntaxError, filterJson, parseFilter, type JsonValue } from "./filter";

const example: JsonValue = {
  sjaiodf: [
    { a: 42, k: [1, 2] },
    { b: 27 },
  ],
  basfsdf: "jas sadf s",
  z: { b: 1, c: 8 },
};

describe("parseFilter", () => {
  it("parses mixed plain and bracket clauses", () => {
    expect(parseFilter(' a, z[b, c], "x,y"["c[d]", Name] ')).toEqual([
      { type: "plain", name: "a" },
      {
        type: "bracket",
        name: "z",
        children: [
          { type: "plain", name: "b" },
          { type: "plain", name: "c" },
        ],
      },
      {
        type: "bracket",
        name: "x,y",
        children: [
          { type: "plain", name: "c[d]" },
          { type: "plain", name: "Name" },
        ],
      },
    ]);
  });

  it("supports JSON escapes and quoted empty property names", () => {
    expect(parseFilter('"line\\nname", root[""]')).toEqual([
      { type: "plain", name: "line\nname" },
      { type: "bracket", name: "root", children: [{ type: "plain", name: "" }] },
    ]);
  });

  it("parses arbitrarily nested clauses", () => {
    expect(parseFilter("A[B[C,D],E[F[G]]]")).toEqual([
      {
        type: "bracket",
        name: "A",
        children: [
          {
            type: "bracket",
            name: "B",
            children: [
              { type: "plain", name: "C" },
              { type: "plain", name: "D" },
            ],
          },
          {
            type: "bracket",
            name: "E",
            children: [
              {
                type: "bracket",
                name: "F",
                children: [{ type: "plain", name: "G" }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("parses equality predicates with bare and quoted values", () => {
    expect(parseFilter('items[status=active,status="keep active",enabled=true,value=null]')).toEqual([
      {
        type: "bracket",
        name: "items",
        children: [
          { type: "equality", name: "status", expectedValue: "active" },
          { type: "equality", name: "status", expectedValue: "keep active" },
          { type: "equality", name: "enabled", expectedValue: "true" },
          { type: "equality", name: "value", expectedValue: "null" },
        ],
      },
    ]);
  });

  it("parses a root selector as a distinct top-level clause", () => {
    expect(parseFilter("$[FollowUps[Content[Title]]],id")).toEqual([
      {
        type: "root",
        children: [
          {
            type: "bracket",
            name: "FollowUps",
            children: [
              {
                type: "bracket",
                name: "Content",
                children: [{ type: "plain", name: "Title" }],
              },
            ],
          },
        ],
      },
      { type: "plain", name: "id" },
    ]);
  });

  it("treats a quoted dollar sign as an ordinary property name", () => {
    expect(parseFilter('"$"[value]')).toEqual([
      {
        type: "bracket",
        name: "$",
        children: [{ type: "plain", name: "value" }],
      },
    ]);
  });

  it.each([
    "a,",
    "a[]",
    "a[b,]",
    "a[b",
    "a[[b]]",
    "a[b]]",
    '"open',
    'a"b',
    "a=",
    "a=[]",
    'a="open',
    "outer[$[value]]",
  ]) (
    "rejects malformed expression %s",
    (expression) => expect(() => parseFilter(expression)).toThrow(FilterSyntaxError),
  );
});

describe("filterJson", () => {
  it("implements the plain selector example", () => {
    expect(filterJson(example, parseFilter("a,b")).value).toEqual({
      sjaiodf: [{ a: 42 }, { b: 27 }],
      z: { b: 1 },
    });
  });

  it("implements the bracket selector example", () => {
    expect(filterJson(example, parseFilter("z[b]")).value).toEqual({ z: { b: 1 } });
  });

  it("implements example 2 by filtering every item in an array-valued parent", () => {
    expect(filterJson(example, parseFilter("sjaiodf[a],basfsdf")).value).toEqual({
      sjaiodf: [{ a: 42 }],
      basfsdf: "jas sadf s",
    });
  });

  it("matches case-insensitively while preserving keys and complete values", () => {
    const input: JsonValue = { Wrapper: { NAME: { nested: [1, 2] }, other: true } };
    expect(filterJson(input, parseFilter("name")).value).toEqual({
      Wrapper: { NAME: { nested: [1, 2] } },
    });
  });

  it("requires exact names without wildcards and supports prefix and suffix wildcards", () => {
    const input: JsonValue = {
      id: 1,
      ideaSubmissionId: 2,
      templateId: 3,
      unrelated: 4,
    };

    expect(filterJson(input, parseFilter("id")).value).toEqual({ id: 1 });
    expect(filterJson(input, parseFilter("id*")).value).toEqual({
      id: 1,
      ideaSubmissionId: 2,
    });
    expect(filterJson(input, parseFilter("*id")).value).toEqual({
      id: 1,
      ideaSubmissionId: 2,
      templateId: 3,
    });
  });

  it("uses exact and wildcard matching for bracket parents and children", () => {
    const input: JsonValue = {
      record: { id: 1, templateId: 2 },
      recordArchive: { id: 3, templateId: 4 },
    };

    expect(filterJson(input, parseFilter("record[id]")).value).toEqual({
      record: { id: 1 },
    });
    expect(filterJson(input, parseFilter("record*[*id]")).value).toEqual(input);
  });

  it("matches wildcard property names from the specification", () => {
    const input: JsonValue = {
      zxc: 1,
      zxcvd: 2,
      zxckmam: 3,
      ZXCUpper: 4,
      azxc: 5,
      other: 6,
    };

    expect(filterJson(input, parseFilter("zxc*")).value).toEqual({
      zxc: 1,
      zxcvd: 2,
      zxckmam: 3,
      ZXCUpper: 4,
    });
  });

  it("supports wildcards anywhere in plain selector names", () => {
    const input: JsonValue = {
      preMiddlePost: 1,
      prePost: 2,
      anotherPost: 3,
      unrelated: 4,
    };

    expect(filterJson(input, parseFilter("pre*post,*another*")).value).toEqual({
      preMiddlePost: 1,
      prePost: 2,
      anotherPost: 3,
    });
  });

  it("supports wildcard bracket parents and children, including array items", () => {
    const input: JsonValue = {
      recordsPrimary: [
        { userName: "Ada", userId: 1, ignored: true },
        { ignored: true },
      ],
      recordsArchive: { userEmail: "ada@example.test", ignored: true },
      unrelated: { userName: "No match" },
    };

    expect(filterJson(input, parseFilter("records*[user*]")).value).toEqual({
      recordsPrimary: [{ userName: "Ada", userId: 1 }],
      recordsArchive: { userEmail: "ada@example.test" },
    });
  });

  it("treats a standalone wildcard as matching every property", () => {
    const input: JsonValue = { a: 1, nested: { b: 2 } };
    expect(filterJson(input, parseFilter("*")).value).toEqual(input);
  });

  it("unions mixed and duplicate bracket clauses", () => {
    const input: JsonValue = { outer: { Meta: { First: 1, second: 2, third: 3 } } };
    expect(filterJson(input, parseFilter("meta[first],META[second],third")).value).toEqual({
      outer: { Meta: { First: 1, second: 2, third: 3 } },
    });
  });

  it("applies bracket children to direct object properties and direct array items", () => {
    const input: JsonValue = {
      x: { nested: { a: 1 }, a: { complete: true } },
      arrayParent: [{ a: 2, ignored: true }, { ignored: true }, { nested: { a: 3 } }],
    };
    expect(filterJson(input, parseFilter("x[a],arrayParent[a]")).value).toEqual({
      x: { a: { complete: true } },
      arrayParent: [{ a: 2 }],
    });
  });

  it("applies arbitrarily nested selectors to direct children at each level", () => {
    const input: JsonValue = {
      Content: { Title: "Root" },
      Stages: [
        {
          Content: { Title: "Submission", Summary: "Ignored" },
          FollowUps: [
            { Content: { Title: "Rate Idea", Summary: "Ignored" }, ignored: true },
            { Content: { Title: "Close Idea" } },
          ],
        },
      ],
    };

    expect(filterJson(input, parseFilter("FollowUps[Content[Title]]")).value).toEqual({
      Stages: [
        {
          FollowUps: [
            { Content: { Title: "Rate Idea" } },
            { Content: { Title: "Close Idea" } },
          ],
        },
      ],
    });
  });

  it("supports wildcard patterns at every nested level", () => {
    const input: JsonValue = {
      stagesPrimary: [{ followUpsActive: [{ CONTENT: { TitleLong: "Keep", ignored: true } }] }],
      stagesArchive: [{ followUpsActive: [{ other: true }] }],
    };

    expect(filterJson(input, parseFilter("stages*[follow*[content[title*]]]")).value).toEqual({
      stagesPrimary: [{ followUpsActive: [{ CONTENT: { TitleLong: "Keep" } }] }],
    });
  });

  it("uses a nested standalone wildcard to cross any descendant depth", () => {
    const input: JsonValue = {
      Stages: [
        {
          Content: { Title: "Stage title" },
          DirectBranch: { Content: { Title: "Direct match", ignored: true } },
          DeepBranch: {
            Layer: {
              FollowUps: [{ Content: { Title: "Deep match", ignored: true }, ignored: true }],
            },
          },
          UnmatchedBranch: { Content: { Summary: "No title" } },
        },
      ],
    };

    expect(filterJson(input, parseFilter("Stages[*[Content[Title]]]")).value).toEqual({
      Stages: [
        {
          DirectBranch: { Content: { Title: "Direct match" } },
          DeepBranch: {
            Layer: {
              FollowUps: [{ Content: { Title: "Deep match" } }],
            },
          },
        },
      ],
    });
  });

  it("anchors a dollar selector to properties on the root object", () => {
    const input: JsonValue = {
      FollowUps: [{ id: "root", ignored: true }],
      nested: {
        FollowUps: [{ id: "nested", ignored: true }],
      },
    };

    expect(filterJson(input, parseFilter("$[FollowUps]")).value).toEqual({
      FollowUps: [{ id: "root", ignored: true }],
    });
    expect(filterJson(input, parseFilter("$[FollowUps[id]]")).value).toEqual({
      FollowUps: [{ id: "root" }],
    });
  });

  it("does not apply a root selector to items in a root array", () => {
    const input: JsonValue = [
      { FollowUps: [{ id: 1 }] },
      { FollowUps: [{ id: 2 }] },
    ];

    expect(filterJson(input, parseFilter("$[FollowUps]"))).toEqual({
      matched: false,
      value: [],
    });
    expect(filterJson(input, parseFilter("$[FollowUps],id")).value).toEqual([
      { FollowUps: [{ id: 1 }] },
      { FollowUps: [{ id: 2 }] },
    ]);
  });

  it("unions root-anchored and ordinary global selectors", () => {
    const input: JsonValue = {
      FollowUps: [{ id: "root" }],
      nested: { FollowUps: [{ id: "nested" }], title: "Keep" },
    };

    expect(filterJson(input, parseFilter("$[FollowUps],title")).value).toEqual({
      FollowUps: [{ id: "root" }],
      nested: { title: "Keep" },
    });
  });

  it("filters array items by equality without projecting the predicate property", () => {
    const input: JsonValue = {
      items: [
        { id: 1, status: "active" },
        { id: 2, status: "inactive" },
        { id: 3, status: "active" },
      ],
    };

    expect(filterJson(input, parseFilter("items[id,status=active]")).value).toEqual({
      items: [{ id: 1 }, { id: 3 }],
    });
    expect(filterJson(input, parseFilter("items[status=active]")).value).toEqual({
      items: [{ id: 1 }, { id: 3 }],
    });
  });

  it("projects a predicate property only when it also has a plain selector", () => {
    const input: JsonValue = {
      items: [
        { status: "active", ignored: 1 },
        { status: "inactive", ignored: 2 },
      ],
    };

    expect(filterJson(input, parseFilter("items[status,status=active]")).value).toEqual({
      items: [{ status: "active" }],
    });
  });

  it("combines repeated equality predicates with OR semantics", () => {
    const input: JsonValue = {
      items: [
        { status: "active" },
        { status: "paused" },
        { status: "archived" },
      ],
    };

    expect(
      filterJson(input, parseFilter("items[status,status=active,status=paused]")).value,
    ).toEqual({
      items: [{ status: "active" }, { status: "paused" }],
    });
  });

  it("matches scalar values by text across strings, numbers, booleans, and null", () => {
    const input: JsonValue = {
      groups: {
        booleans: [{ value: true, id: 1 }, { value: "true", id: 2 }, { value: false, id: 3 }],
        nulls: [{ value: null, id: 4 }, { value: "null", id: 5 }],
        numbers: [{ value: 42, id: 6 }, { value: "42", id: 7 }],
        phrases: [{ status: "keep active", id: 8 }, { status: "inactive", id: 9 }],
      },
    };

    expect(filterJson(input, parseFilter("booleans[id,value=true]")).value).toEqual({
      groups: { booleans: [{ id: 1 }, { id: 2 }] },
    });
    expect(filterJson(input, parseFilter("nulls[id,value=null]")).value).toEqual({
      groups: { nulls: [{ id: 4 }, { id: 5 }] },
    });
    expect(filterJson(input, parseFilter("numbers[id,value=42]")).value).toEqual({
      groups: { numbers: [{ id: 6 }, { id: 7 }] },
    });
    expect(filterJson(input, parseFilter('phrases[id,status="keep active"]')).value).toEqual({
      groups: { phrases: [{ id: 8 }] },
    });
  });

  it("supports equality predicates as global and deeply nested clauses", () => {
    const input: JsonValue = {
      root: {
        items: [
          { id: 1, details: { status: "active", title: "Keep" } },
          { id: 2, details: { status: "inactive", title: "Drop" } },
        ],
      },
    };

    expect(filterJson(input, parseFilter("status=active,title")).value).toEqual({
      root: { items: [{ details: { title: "Keep" } }] },
    });
    expect(filterJson(input, parseFilter("items[details[title,status=active]]")).value).toEqual({
      root: { items: [{ details: { title: "Keep" } }] },
    });
  });

  it("keeps matching array elements in order and removes the rest", () => {
    const input: JsonValue = [{ a: 1 }, { no: 2 }, [{ A: 3 }, 4], 5];
    expect(filterJson(input, parseFilter("a")).value).toEqual([{ a: 1 }, [{ A: 3 }]]);
  });

  it("returns root-shaped values when there are no matches", () => {
    expect(filterJson({ a: 1 }, parseFilter("missing"))).toEqual({ matched: false, value: {} });
    expect(filterJson([1, 2], parseFilter("missing"))).toEqual({ matched: false, value: [] });
    expect(filterJson("text", parseFilter("missing"))).toEqual({ matched: false, value: null });
  });

  it("returns the original value for an empty filter", () => {
    expect(filterJson(example, parseFilter("   "))).toEqual({ matched: true, value: example });
  });
});
