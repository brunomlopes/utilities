# App Insights Stack Parser

Open **App Insights Stack Parser** from the Utilities homepage or visit `/app-insights-stack-parser`.

1. Copy the JSON `details` array from an Azure Application Insights exception.
2. Paste it into **Details JSON**. Formatting updates automatically.
3. Read one table per exception: `id`, `outerId`, `severityLevel`, and `type` share the first row; `message` and `parsedStack` each occupy a subsequent full-width row.
4. Use **Copy rich text** for Jira's visual description editor, or **Copy wiki markup** for a description field that accepts Jira wiki notation. Both buttons copy all exceptions.
5. Use **Clear** to remove the input and output.

Rich-text copying supplies HTML tables and a readable plain-text alternative. The receiving editor controls which formatting it retains. Wiki output uses a four-cell metadata table followed by the message and a stack code block for each exception, avoiding merged-cell markup. Wiki syntax in messages and metadata is escaped.

Clipboard access requires HTTPS or localhost and browser permission. If copying fails, the tool reports it and keeps the output available for manual selection. Copy buttons are disabled when there are no valid exceptions.

Example input:

```json
[{"id":"20350564","outerId":"0","severityLevel":"Error","type":"System.Exception","message":"Unable to resolve service.","parsedStack":[{"method":"Funq.Container.ResolveImpl","level":0,"line":202,"fileName":"/src/Container.cs"},{"method":"lambda_method","level":1,"line":0}]}]
```

The stack row shows:

```text
   at Funq.Container.ResolveImpl in /src/Container.cs:line 202
   at lambda_method
```

Messages retain line breaks. Methods retain their supplied names; assembly and frame-level metadata are omitted from the C#-style trace. Missing filenames and unknown line numbers do not produce invented locations. Exception and frame order match the input.

All parsing happens in the browser. Input is not uploaded or saved. Malformed JSON and invalid fields produce an error instead of partial output. See [SPEC.md](SPEC.md) for the input and rendering contract.

## Exception nesting

The displayed exceptions use one vertical line and 16 pixels of indentation per nesting level, covering both the caption and table. Levels follow `outerId` → `id` links, including parents later in the input; siblings share a level and separate roots have no lines. Input order stays unchanged. Numeric and string IDs match. `outerId: 0`, missing or ambiguous parents, and members of a cyclic parent chain are treated as roots. Clipboard formats remain as described above.

## Development

From the repository root, run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. In this workspace use Node/npm from `C:\utils\nodejs-v22\tools`. The static export includes `out/app-insights-stack-parser/index.html`.
