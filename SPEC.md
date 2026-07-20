## Overview

This repository contains a javascript web app  in nextjs that takes JSON on the left, using a large text area, and on the right at the top has a text box to input a filter, and shows on the bottom another text area with the same JSON, but filtered.

### Filter definition

The filter to apply is described as follows:
- "a,b,c" shows all objects where there is at least one sub-property with those names
- "x[a,b,c]" shows all object, where there is at least one sub-property x with one of these names


### Examples
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