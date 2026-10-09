# App Insights Stack Parser

Open **App Insights Stack Parser** from the Utilities homepage or visit `/app-insights-stack-parser`.

1. Copy the JSON `details` array from an Azure Application Insights exception.
2. Paste it into **Details JSON**. Formatting updates automatically.
3. Read one table per exception: `id`, `outerId`, `severityLevel`, and `type` share the first row; `message` and `parsedStack` each occupy a subsequent full-width row.
4. Use **Clear** to remove the input and output.

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

## Development

From the repository root, run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. In this workspace use Node/npm from `C:\utils\nodejs-v22\tools`. The static export includes `out/app-insights-stack-parser/index.html`.
