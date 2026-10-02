"use client";

import { useEffect, useRef, useState } from "react";
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
  const passwordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    generation.current += 1;
    if (passwordTimer.current !== null) clearTimeout(passwordTimer.current);
  }, []);

  function cancelPasswordTimer() {
    if (passwordTimer.current !== null) clearTimeout(passwordTimer.current);
    passwordTimer.current = null;
  }

  function invalidate() {
    cancelPasswordTimer();
    generation.current += 1;
    setOutput(""); setError(""); setStatus(""); setBusy(false);
  }
  function clear() {
    invalidate(); setPem(""); setFiles([]); setPassword("");
    if (fileInput.current) fileInput.current.value = "";
  }
  async function inspect(nextPem = pem, nextFiles = files, nextPassword = password) {
    cancelPasswordTimer();
    if (!nextPem.trim() && !nextFiles.length) return;
    const request = ++generation.current;
    setBusy(true); setOutput(""); setError(""); setStatus("");
    try {
      if (nextFiles.length > 20) throw new Error("Select at most 20 files at a time.");
      if (nextFiles.some(file => file.size > MAX_INPUT_BYTES)) throw new Error("Each file must be no larger than 5 MiB.");
      if (nextFiles.reduce((total, file) => total + file.size, new TextEncoder().encode(nextPem).length) > MAX_INPUT_BYTES * 4) throw new Error("Combined input must be no larger than 20 MiB.");
      const inputs: InspectionInput[] = await Promise.all(nextFiles.map(async file => ({ name: file.name, data: await file.arrayBuffer() })));
      if (request !== generation.current) return;
      if (nextPem.trim()) inputs.unshift({ name: "Pasted PEM", data: nextPem });
      const { inspectCertificates } = await import("./inspect");
      if (request !== generation.current) return;
      const report = await inspectCertificates(inputs, nextPassword);
      if (request === generation.current) setOutput(report);
    } catch (caught) {
      if (request === generation.current) setError(caught instanceof Error ? caught.message : "Could not inspect this input.");
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  function changePem(value: string) {
    invalidate();
    setPem(value);
    void inspect(value, files, password);
  }
  function changeFiles(value: File[]) {
    invalidate();
    setFiles(value);
    void inspect(pem, value, password);
  }
  function changePassword(value: string) {
    invalidate();
    setPassword(value);
    if (!pem.trim() && !files.length) return;
    setStatus("Waiting for password input…");
    passwordTimer.current = setTimeout(() => {
      passwordTimer.current = null;
      void inspect(pem, files, value);
    }, 1000);
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
        <textarea id="certificate-pem" className="certificate-code" spellCheck={false} autoComplete="off" value={pem} onChange={event => changePem(event.target.value)} placeholder={"-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----"} />
        <label htmlFor="certificate-files">Upload PEM, DER, .p12 or .pfx files</label>
        <input ref={fileInput} id="certificate-files" type="file" multiple accept=".pem,.crt,.cer,.der,.p12,.pfx,.key" onChange={event => changeFiles(Array.from(event.target.files ?? []))} />
        <p className="certificate-help">{files.length ? files.map(file => file.name).join(", ") : "Select certificates and keys together, or paste a PEM bundle above."} Maximum 5 MiB per input, 20 MiB total, 20 files.</p>
        <label htmlFor="certificate-password">Password for encrypted keys or bundles</label>
        <input id="certificate-password" type="password" autoComplete="off" value={password} onChange={event => changePassword(event.target.value)} placeholder="Leave empty for unencrypted input" />
        <p className="certificate-help">Inspection starts automatically when input or files change. Password changes are inspected after one second without further edits.</p>
        <p className="certificate-help">Private keys are used only for metadata and matching. Private values never appear in the report. No input is saved by this tool.</p>
        <div className="certificate-actions">
          <button type="button" className="certificate-primary" disabled={busy || (!pem.trim() && !files.length)} onClick={() => void inspect()}>{busy ? "Inspecting…" : "Inspect certificate"}</button>
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
