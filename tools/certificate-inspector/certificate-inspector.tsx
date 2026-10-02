"use client";

import { useRef, useState } from "react";
import { MAX_INPUT_BYTES, type InspectionInput } from "./inspect";

export function CertificateInspector() {
  const [pem, setPem] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  function invalidate() {
    generation.current += 1;
    setOutput(""); setError(""); setStatus(""); setBusy(false);
  }
  function clear() {
    invalidate(); setPem(""); setFiles([]); setPassword("");
    if (fileInput.current) fileInput.current.value = "";
  }
  async function inspect() {
    const request = ++generation.current;
    setBusy(true); setOutput(""); setError(""); setStatus("");
    try {
      if (files.length > 20) throw new Error("Select at most 20 files at a time.");
      if (files.some(file => file.size > MAX_INPUT_BYTES)) throw new Error("Each file must be no larger than 5 MiB.");
      if (files.reduce((total, file) => total + file.size, new TextEncoder().encode(pem).length) > MAX_INPUT_BYTES * 4) throw new Error("Combined input must be no larger than 20 MiB.");
      const inputs: InspectionInput[] = await Promise.all(files.map(async file => ({ name: file.name, data: await file.arrayBuffer() })));
      if (pem.trim()) inputs.unshift({ name: "Pasted PEM", data: pem });
      const { inspectCertificates } = await import("./inspect");
      const report = await inspectCertificates(inputs, password);
      if (request === generation.current) setOutput(report);
    } catch (caught) {
      if (request === generation.current) setError(caught instanceof Error ? caught.message : "Could not inspect this input.");
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  async function copy() {
    const request = generation.current;
    try {
      await navigator.clipboard.writeText(output);
      if (request === generation.current) setStatus("Report copied.");
    } catch {
      if (request === generation.current) setStatus("Could not copy. Select the report and copy it manually.");
    }
  }
  return (
    <section className="certificate-workspace" aria-label="Certificate inspector">
      <div className="certificate-pane certificate-source">
        <div className="certificate-heading"><h2>01 · Certificate input</h2><span>Local only</span></div>
        <label htmlFor="certificate-pem">PEM certificates and optional private keys</label>
        <textarea id="certificate-pem" className="certificate-code" spellCheck={false} autoComplete="off" value={pem} onChange={event => { invalidate(); setPem(event.target.value); }} placeholder={"-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----"} />
        <label htmlFor="certificate-files">Upload PEM, DER, .p12 or .pfx files</label>
        <input ref={fileInput} id="certificate-files" type="file" multiple accept=".pem,.crt,.cer,.der,.p12,.pfx,.key" onChange={event => { invalidate(); setFiles(Array.from(event.target.files ?? [])); }} />
        <p className="certificate-help">{files.length ? files.map(file => file.name).join(", ") : "Select certificates and keys together, or paste a PEM bundle above."} Maximum 5 MiB per input, 20 MiB total, 20 files.</p>
        <label htmlFor="certificate-password">Password for encrypted keys or bundles</label>
        <input id="certificate-password" type="password" autoComplete="off" value={password} onChange={event => { invalidate(); setPassword(event.target.value); }} placeholder="Leave empty for unencrypted input" />
        <p className="certificate-help">Private keys are used only for metadata and matching. Private values never appear in the report. No input is saved by this tool.</p>
        <div className="certificate-actions">
          <button type="button" className="certificate-primary" disabled={busy || (!pem.trim() && !files.length)} onClick={inspect}>{busy ? "Inspecting…" : "Inspect certificate"}</button>
          <button type="button" onClick={clear}>Clear all</button>
        </div>
        {error && <p className="certificate-error" role="alert">{error}</p>}
      </div>
      <div className="certificate-pane">
        <div className="certificate-heading"><h2>02 · Inspection report</h2><button type="button" onClick={copy} disabled={!output}>Copy report</button></div>
        <p className="certificate-help">OpenSSL-style certificate details. Date validity and key matching do not establish trust. Signatures, certificate chains, and revocation are not verified.</p>
        <label className="certificate-sr-only" htmlFor="certificate-report">Inspection report</label>
        <textarea id="certificate-report" className="certificate-code certificate-report" readOnly spellCheck={false} value={output} placeholder="Certificate details appear here after inspection." />
        <p className="certificate-status" role="status">{busy ? "Inspecting locally…" : status || (output ? "Inspection complete." : "")}</p>
      </div>
    </section>
  );
}
