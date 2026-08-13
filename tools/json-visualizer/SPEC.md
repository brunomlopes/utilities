## Overview

This repository contains a javascript web app  in nextjs that takes JSON on the left, using a large text area, and on the right at the top has a text box to input a filter, and shows on the bottom another text area with the same JSON, but filtered.

This should be a client side application in react, using the current best practices.

### Filter definition

The filter to apply is described as follows:
- "a,b,c" shows all objects where there is at least one sub-property with those names
- "x[a,b,c]" shows all object, where there is at least one sub-property x with one of these names
- when x is an array, "x[a],b" should apply the "a" filter to all items on the array x. 
- * can be used to wildcard properties. "zxc*" should match "zxc","zxcvd","zxckmam"
- x[a=42] can be used to only show items where `a=42`
- Nested filters should work. FollowUps[Content[Title]] should filter according to example 7
- Nested selectors match direct children, while a nested standalone `*` crosses any number of descendant levels recursively. For example, `Stages[*[Content[Title]]]` filters according to example 8.

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

