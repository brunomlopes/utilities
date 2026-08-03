## Overview

This repository contains a javascript web app  in nextjs that takes JSON on the left, using a large text area, and on the right at the top has a text box to input a filter, and shows on the bottom another text area with the same JSON, but filtered.

This should be a client side application in react, using the current best practices.

### Filter definition

The filter to apply is described as follows:
- "a,b,c" shows all objects where there is at least one sub-property with those names
- "x[a,b,c]" shows all object, where there is at least one sub-property x with one of these names
- when x is an array, "x[a],b" should apply the "a" filter to all items on the array x. 
- * can be used to wildcard properties. "zxc*" should match "zxc","zxcvd","zxckmam"

### UI behaviour

- UI.1 When json is pasted on the input, auto-format the json file. Add a button to revert auto-format
- UI.2 The filter text box should increase vertically in size when the filter no longer fits
- UI.3 On the input side of the UI, there is a button to load a json file. It takes the file and loads it to the json input
- UI.4 On the output side of the UI, we have two tabs: One for the filtered json, named "tree", and another tab where we show a table with the results of the first property that is an array on the object, navigating breadth-first. See example 3 below.
This table contains as headers the subproperties of objects found on the array, and as rows the property values.
- UI.5 When rendering a table, flatten an object if the subproperties are all primitives. See example 4 below
- UI.6 When rendering a table, if an array only has one item, search the sub-items, breadth first, until you find an array with more than one item. Apply this recursively until finding either one array with more than one item, or it's the last array. See example 5 below

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