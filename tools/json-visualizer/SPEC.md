## Overview

This repository contains a javascript web app  in nextjs that takes JSON on the left, using a large text area, and on the right at the top has a text box to input a filter, and shows on the bottom another text area with the same JSON, but filtered.

This should be a client side application in react, using the current best practices.

### Filter definition

The filter to apply is described as follows:
- Filter 1. "a,b,c" shows all objects where there is at least one sub-property with those names
- Filter 2. "x[a,b,c]" shows all object, where there is at least one sub- Filter 1.property x with one of these names
- Filter 3. when x is an array, "x[a],b" should apply the "a" filter to all items on the array x.
- Filter 4. * can be used to wildcard properties. "zxc*" should match "zxc","zxcvd","zxckmam"
- Filter 5. x[a=42] can be used to only show items where `a=42`. This filter can appear anywhere where a property is used. The property being filtered does not appear
- Filter 6. x[a,a=42] can be used to show property a, and filter by a=42
- Filter 7. x[a,a=42,a=27] can be used to show property a, and filter by either a=42 or a=27
- Filter 8. Nested filters should work. FollowUps[Content[Title]] should filter according to example 7
- Filter 9. Nested selectors match direct children, while a nested standalone `*` crosses any number of descendant levels recursively. For example, `Stages[*[Content[Title]]]` filters according to example 8.

Filters 5–7 compare scalar values by their text. Bare values support strings without spaces,
numbers, booleans, and `null`; JSON-quoted values support spaces and escapes. Consequently,
`enabled=true` matches both boolean `true` and string `"true"`, while
`status="keep active"` matches the string `"keep active"`. Repeated predicates in the same
selector use OR logic.

For example, given:

```json
{
  "items": [
    { "id": 1, "status": "active" },
    { "id": 2, "status": "keep active" },
    { "id": 3, "status": "archived" }
  ]
}
```

- `items[status=active]` returns `{ "items": [{ "id": 1 }] }`; the matching item's other properties are retained while predicate-only `status` is omitted. `items[id,status=active]` produces the same result by explicitly projecting only `id`.
- `items[status,status="keep active"]` returns `{ "items": [{ "status": "keep active" }] }`; the plain `status` selector projects the predicate property.
- `items[status,status=active,status=archived]` returns the first and third items with their `status` properties, because either predicate may match.

### UI behaviour

- UI.1 When json is pasted on the input, auto-format the json file. Add a button to revert auto-format
- UI.2 The filter text box should increase vertically in size when the filter no longer fits
- UI.3 On the input side of the UI, there is a button to load a json file. It takes the file and loads it to the json input
- UI.3.1 On the input side of the UI there is a button to paste content. The button replaces the json input content with the contents from the user's clipboard
- UI.4 On the output side of the UI, we have two tabs: One for the filtered json, named "tree", and another tab where we show a table with the results of the first property that is an array on the object, navigating breadth-first. See example 3 below.
This table contains as headers the subproperties of objects found on the array, and as rows the property values.
- UI.5 When rendering a table, flatten an object if the subproperties are all primitives. See example 4 below
- UI.6 When rendering a table, if an array only has one item, search the sub-items, breadth first, until you find an array with more than one item. Apply this recursively until finding either one array with more than one item, or it's the last array. See example 5 below
- UI.7 The table allows sorting values by column. Clicking on each column toggles between original-order,ascending,descending. When toggling the order of a column, there is an indicator if it's ascending or descending. Order is case-insensitive.
- UI.8 On the output section, there is a checkbox, set by default, named "Compact output". When this checkbox is set, the output is formatted in a compact way, where an object with just one item or property is rendered in the same line. See Example 6.
- UI.9 On the input side of the ui, there is a button to colapse the input side, which expands the filter + output side
- UI.10 On the header, there is a button to colapse the header so that the input + output boxes take up more of the screen
- UI.11 Buttons for collapse input, paste content, load json file, revert formatting, copy json and collapse/expand header should all be icons with text as the tooltip.
- UI.12 Collapse/expand header button should be next to the other collapse input, paste content, etc buttons.
- UI.13 The help text for filter expression should be as a tooltip for a question mark icon near "FILTER EXPRESSION"
- UI.14 When rendering a table, if the root object is an array with more than one item, use the root object as the array for the table
- UI.15 When rendering a table cell, if the value is an array, render it as a subtable, using the same rules as the main table.

### Table rendering rules

- The table is built from the filtered JSON output, not directly from the source input.
- A root array with more than one item takes precedence when it contains at least one object. Its object items become rows and any primitive items are ignored. A primitive-only or singleton root array does not produce a table.
- Otherwise, starting from a root object, object properties are searched breadth-first for the first array containing at least one object. Properties and branches at the same depth are considered in JSON insertion order. Primitive-only arrays are skipped.
- When the selected array has exactly one total item, the same breadth-first search is repeated inside its sole object row. This continues through consecutive singleton arrays until an array with more than one item is found or the last eligible array is reached. The search stays inside the initially selected branch.
- Table columns are the union of the object rows' properties. Parent properties and flattened child properties appear in the order they are first encountered across the rows.
- A property is flattened by one level when every present, non-null value for that property is a non-empty object whose direct children are all primitives. Its columns use `parent.child` labels. Missing and null parent values do not prevent flattening and render blank; nested objects are not flattened recursively.
- Missing properties render as blank cells. Strings render without quotes, other primitives render as their text, and arrays or non-flattened objects render as compact JSON. A present `null` value renders as `null` unless it is the missing/null parent of a flattened property.
- Literal dotted property names and dotted labels produced by flattening remain distinct columns internally, even when their displayed labels are identical.
- Sorting is limited to one column and cycles from original order to ascending, descending, and back to original order. Numbers sort numerically, strings case-insensitively, booleans with `false` before `true`, and mixed-type or complex columns by displayed text. Equal values retain their original order; missing and empty-string values remain last in both directions, while `null` is treated as populated.
- If no eligible object array exists, the table shows the no-object-array empty state. If an eligible array's object rows have no properties, it shows the no-properties empty state.


### Examples

#### Example 1

With the following json:
```json
{
    "sjaiodf":[
    {
        "a":42,
        "k":[1,2]
    },
    {
        "b":27
    }
    ],
    "basfsdf":"jas sadf s",
    "z":{
        "b":1,
        "c":8
    }
}
```

The filter "a,b" should result in:
```json
{
    "sjaiodf":[
    {
        "a":42,
    },
    {
        "b":27
    }
    ],
    "z":{
        "b":1
    }
}
```
With the same json, the filter z[b] should result in
```json
{
    "z":{
        "b":1
    }
}
```

#### Example 2

With this input

```json
{
    "sjaiodf":[
    {
        "a":42,
        "k":[1,2]
    },
    {
        "b":27
    }
    ],
    "basfsdf":"jas sadf s",
    "z":{
        "b":1,
        "c":8
    }
}
```

the filter "sjaiodf[a],basfsdf" should return

```json
{
    "sjaiodf":[
    {
        "a":42,
    }
    ],
    "basfsdf":"jas sadf s"
}
```

#### Example 3
with input
```json
{
    "pagedResults":
    {
        "results":[{
            "a":1,"b":2
        },{
            "a":1,"b":42
        }],
        "totalCount":42,
        "currentPage":27
    }
}
```

The filter `results[a,b]` shows as a table:

| a | b  |
|---|----|
| 1 | 2  |
| 1 | 24 |

#### Example 4

If the resulting json is:

```json
{
  "pagedResults": {
    "results": [
      {
        "id": 2081,
        "multiLanguageContent": {
          "title": "abcd"
        },
        "owner": {
          "id": 4988,
          "userName": "190172"
        }
      },
      {
        "id": 791,
        "multiLanguageContent": {
          "title": "efg"
        },
        "owner": {
          "id": 1040,
          "userName": "204253"
        }
      }
   ]
  }
}
```

A table format would be 

| id | multilanguageContent.title  | owner.id | owner.userName |
|---|----|---|----|
| 2080 | abcd  | 4988 | 190172  |
| 791 | efg  | 1040 | 204253  |


#### Example 5

If the resulting json is:

```json
{
  "items": {
    "34": [
      {
        "key": "idsrv",
        "value": [
          {
            "type": "nbf",
            "value": "1785405758",
          },
          {
            "type": "exp",
            "value": "1785406058",
          }
      }
    ]
  }
}

```

A table format would be 

| type | value |
|------|-------|
| nbf | 1785405758  |
| exp | 1785406058  |

#### Example 6

When output is compact, the following JSON :

```json
{
  "Content": {
    "Title": "Innovation Challenge Workflow"
  },
  "Stages": [
    {
      "Id": "1",
      "Content": {
        "Title": "Submission"
      },
      "OnEnter": {
        "Actions": [
          {
            "Id": "19e0547e-a103-4874-8bfb-35bc5706f427"
          },
          {
            "Id": "7a71881a-b239-4599-b855-c93795ceaba3"
          },
          {
            "Id": "c19dfe27-c71c-49e3-9d09-214886cbe443"
          }
        ]
      },
      "OnDurationElapsed": {
        "Actions": [
          {
            "Id": "7609e9e8-d5f3-4e90-bc8b-c865f09ad1b3"
          }
        ]
      },
    }
  ]
}
```

Should format as

```json
{
  "Content": { "Title": "Innovation Challenge Workflow" },
  "Stages": [
    {
      "Id": "1",
      "Content": { "Title": "Submission" },
      "OnEnter": {
        "Actions": [
          { "Id": "19e0547e-a103-4874-8bfb-35bc5706f427" },
          { "Id": "7a71881a-b239-4599-b855-c93795ceaba3" },
          { "Id": "c19dfe27-c71c-49e3-9d09-214886cbe443" }
        ]
      },
      "OnDurationElapsed": { "Actions": [ { "Id": "7609e9e8-d5f3-4e90-bc8b-c865f09ad1b3" } ] },
    }
  ]
}
```

#### Example 7

The following input 

```json
{
  "Content": {
    "Title": "Innovation Challenge Workflow"
  },
  "Stages": [
    {
      "Content": {
        "Title": "Submission"
      },
      "FollowUps": [
        {
          "Content": {
            "Title": "Rate Idea"
          }
        },
        {
          "Content": {
            "Title": "Pick for Evaluation"
          }
        },
        {
          "Content": {
            "Title": "Close Idea"
          }
        }
      ]
    }
  ]
}
```
When filtered by `FollowUps[Content[Title]]` would appear as
```json
{
  "Stages": [
    {
      "FollowUps": [
        { "Content": { "Title": "Rate Idea" } },
        { "Content": { "Title": "Pick for Evaluation" } },
        { "Content": { "Title": "Close Idea" } }
      ]
    }
  ]
}
```

#### Example 8

The following input demonstrates a recursive wildcard crossing branches of different depths:

```json
{
  "Stages": [
    {
      "Content": { "Title": "Stage title" },
      "DirectBranch": {
        "Content": { "Title": "Direct match", "Summary": "Ignored" }
      },
      "DeepBranch": {
        "Layer": {
          "FollowUps": [
            { "Content": { "Title": "Deep match", "Summary": "Ignored" } }
          ]
        }
      },
      "UnmatchedBranch": {
        "Content": { "Summary": "No title" }
      }
    }
  ]
}
```

When filtered by `Stages[*[Content[Title]]]`, it appears as:

```json
{
  "Stages": [
    {
      "DirectBranch": {
        "Content": { "Title": "Direct match" }
      },
      "DeepBranch": {
        "Layer": {
          "FollowUps": [
            { "Content": { "Title": "Deep match" } }
          ]
        }
      }
    }
  ]
}
```


#### Example 9

The following input 

```json
{
  "Content": {
    "Title": "Innovation Challenge Workflow"
  },
  "Stages": [
    {
      "Id":1,
      "Content": {
        "Title": "Submission"
      },
      "FollowUps": [
        {
          "Content": {
            "Title": "Rate Idea"
          }
        },
        {
          "Content": {
            "Title": "Pick for Evaluation"
          }
        },
        {
          "Content": {
            "Title": "Close Idea"
          }
        }
      ]
    },
    {
      "Id":2,
      "Content": {
        "Title": "Validation"
      },
      "FollowUps": [
        {
          "Content": {
            "Title": "Val 1"
          }
        },
        {
          "Content": {
            "Title": "Val 2"
          }
        }
      ]
    }
  ]
}
```
When filtered by `Stages[Id:2,FollowUps[Content[Title]]` would appear as
```json
{
  "Stages": [
    {
      "FollowUps": [
        { "Content": { "Title": "Rate Idea" } },
        { "Content": { "Title": "Pick for Evaluation" } },
        { "Content": { "Title": "Close Idea" } }
      ]
    }
  ]
}
```
