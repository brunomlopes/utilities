"use client";

import Link from "next/link";
import { CertificateInspector } from "@/tools/certificate-inspector/certificate-inspector";
import "@/tools/certificate-inspector/certificate-inspector.css";

export default function CertificateInspectorPage() {
  return (
    <main className="certificate-shell">
      <header className="certificate-hero">
        <div><Link href="/">← Back to Utilities</Link><h1>Certificate Inspector</h1></div>
        <p>Inspect certificates locally. Certificates, keys, and passwords stay in this tab.</p>
      </header>
      <CertificateInspector />
    </main>
  );
}
