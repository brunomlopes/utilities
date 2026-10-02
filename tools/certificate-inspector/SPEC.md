# Certificate Inspector specification

## Purpose and architecture

Provide `/certificate-inspector`, registered in the Utilities catalog, as a client-only Next.js tool. Parse locally using bundled ASN1js, PKIjs, and Forge. Remain compatible with static export: no API routes, server actions, uploads, remote lookups, or server-runtime processing. Use Web Crypto for fingerprints and supported key matching; HTTPS or localhost is required.

## Input

- Accept pasted PEM containing one or more X.509 certificates and optional private keys.
- Accept multiple local files: PEM certificates/bundles, binary DER X.509 certificates, and PKCS#12 `.p12`/`.pfx` bundles. PEM key files can accompany certificate files.
- Recognize certificate and PKCS#12 binary encodings; `.p12`/`.pfx` extensions select PKCS#12 directly.
- Support PKCS#1 RSA, SEC1 named-curve EC, and PKCS#8 private keys; encrypted PKCS#8 and legacy encrypted RSA PEM use the entered password.
- Support PKCS#12 passwords, including the empty password, and common PBES2/AES and legacy 3DES/RC2 encryption supported by Forge. Verify a bundle's integrity MAC when present; disclose its absence.
- A single password applies to all selected inputs. Files needing different passwords must be inspected separately.
- Require at least one certificate. Reject unsupported PEM blocks, malformed/truncated inputs, wrong passwords, and unsupported encryption with an accessible error; never show partial results as a successful inspection.
- Limit each input to 5 MiB, combined inputs to 20 MiB, and selected files to 20.

## Output

Produce a selectable, read-only, copyable text report resembling `openssl x509 -text -noout`, with four-space indentation. Include every supplied certificate, in input order:

- Version, hexadecimal serial number, issuer and subject distinguished names.
- Validity timestamps in UTC, and current date status (not yet valid, within validity period, or expired).
- Public-key algorithm, RSA bit length/modulus/exponent, or EC named curve/public point and other algorithm public bytes.
- All extensions, their OIDs/names and critical flags. Decode basic constraints, key usage, SAN DNS/email/URI/IP, EKU and generic ASN.1 values; retain hexadecimal representations for binary or undecodable values.
- Signature algorithm, available signature parameters and signature bytes.
- SHA-256 and SHA-1 fingerprints over the DER certificate. SHA-1 is a descriptive fingerprint, not a security recommendation.

For each private key, show only an allowlist of algorithm, RSA size/public exponent, EC curve, known EdDSA size, and certificate match status. Match RSA public components directly; use Web Crypto signing/verification for supported named-curve EC and EdDSA keys. Report an indeterminate result when browser/algorithm support prevents a determination. Never include private exponents, primes, scalar/seed bytes, decrypted key encodings, or passwords in report or clipboard output.

## Interaction and privacy

Use the existing suite's two-pane visual style, stacking on narrow screens. Inspect automatically when PEM input changes (including paste) or files are selected. Debounce password edits/pastes for one second after the latest change, then inspect using the latest inputs. Do not inspect empty certificate input. Retain explicit Inspect for an immediate retry, Copy report, and Clear all actions, labeled controls, a masked password field, busy/debounce feedback, and accessible errors/status. Editing input invalidates the previous report. New certificate input or an explicit retry cancels any pending password timer. Clearing input or unmounting cancels pending timers and invalidates in-flight results; pending results cannot restore cleared content.

Do not transmit, log, or persist certificate inputs, keys, passwords, or reports. Hold data only in tab memory. Do not claim guaranteed memory erasure in a garbage-collected browser. Copy only the generated report, on user action.

## Boundaries

This is inspection, not trust validation. Do not verify certificate signatures/chains, consult OS trust stores, fetch issuer certificates, or check revocation. Date validity and certificate-key matching are separate from trust. Output is OpenSSL-style, not byte-for-byte OpenSSL output.

Unknown certificate algorithms can be inspected structurally; key matching depends on browser support. Unsupported encryption/bag types fail explicitly. Legacy encrypted EC PEM, explicit EC parameters, CSRs, standalone public keys, PKCS#7, JKS, and DER private-key uploads are outside the current scope. Convert unsupported private-key encodings to PKCS#8 PEM locally.

## Verification

Automate PEM/DER/chain parsing, fingerprints against Node's independent X.509 parser, decoded extension fields, date states, RSA/EC/Ed25519 metadata and matching, encrypted PEM and PKCS#12 success/wrong-password cases, malformed/oversized input handling, and private RSA component exclusion. Test input/report/clipboard/error/clear flows and stale-result suppression. Run the repository's tests, lint, typecheck and static build.
