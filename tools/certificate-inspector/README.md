# Certificate Inspector

Open `/certificate-inspector` from the Utilities homepage to inspect PKI certificates entirely in your browser. The report resembles `openssl x509 -text -noout` and includes subject, issuer, serial number, validity, public key, extensions, signature, and SHA-256/SHA-1 fingerprints.

## Usage

1. Paste a PEM certificate or bundle, or select local `.pem`, `.crt`, `.cer`, `.der`, `.p12`, or `.pfx` files. You can select PEM private-key files alongside certificates, or paste a certificate and its key together. All certificates in a bundle are reported.
2. Enter the password if a private key or PKCS#12 bundle is encrypted. Leave it empty for unencrypted inputs or empty-password bundles. One password applies to all inputs in an inspection.
3. Inspection starts automatically when PEM input changes or files are selected. Password changes trigger a new inspection after one second without further edits, including when a password is pasted. **Inspect certificate** is also available to retry immediately. Select **Copy report** to copy the details. Use **Clear all** to remove inputs, selected files, password, and report from the tool's state.

Maximum input sizes: 5 MiB each, 20 MiB combined, and 20 selected files. Serve over HTTPS or localhost for Web Crypto and clipboard support. If copying fails, select the report and copy manually.

## Private keys and privacy

The tool shows only private-key metadata (algorithm, RSA size/public exponent, EC curve, or known EdDSA size) and whether a key matches any supplied certificate. Private values, decrypted key encodings, and passwords never enter the report or its clipboard output. Parsing and decryption happen locally; the tool does not upload, log, or save inputs. Data remains in browser memory until released; Clear all does not guarantee cryptographic memory erasure.

Supported key encodings include PKCS#1 RSA PEM, SEC1 named-curve EC PEM, PKCS#8 PEM, encrypted PKCS#8, and legacy encrypted RSA PEM. PKCS#12 supports common AES/PBES2 and legacy 3DES/RC2 encryption through Forge, including integrity MAC checking. Unsupported encryption produces an error. RSA matching compares public components; EC/EdDSA matching uses browser Web Crypto when supported and otherwise reports that the match could not be determined.

## Limits

Inspection does not establish trust: certificate signatures, certificate chains, and revocation are not verified. Date status only describes the validity period. The report follows OpenSSL's general structure, rather than duplicating every OpenSSL formatting detail. Unknown OIDs remain visible; binary extension fields are represented in hexadecimal.

Legacy encrypted EC PEM, explicit EC parameters, DER private keys, CSRs, PKCS#7, standalone public keys, and JKS are not supported. Convert unsupported key encodings to PKCS#8 PEM locally. Inspect files with different passwords separately.

Implementation: React Client Components, ASN1js/PKIjs for certificate structures, Forge for PEM and encrypted PKCS#12/key decoding, and Web Crypto for fingerprints and supported key matching. All dependencies are bundled with the app. See [SPEC.md](SPEC.md) for the detailed contract.

## Development

From the repository root, run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. On this workspace use the Node/npm runtime under `C:\utils\nodejs-v22\tools`. The static export includes `out/certificate-inspector/index.html`.
