// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, generateKeyPairSync, sign, webcrypto, X509Certificate } from "node:crypto";
import forge from "node-forge";
import * as asn1js from "asn1js";
import { AlgorithmIdentifier, Certificate, CryptoEngine, setEngine, AttributeTypeAndValue } from "pkijs";
import { inspectCertificates, MAX_INPUT_BYTES } from "./inspect";

const pair = forge.pki.rsa.generateKeyPair(1024);
const cert = forge.pki.createCertificate();
cert.publicKey = pair.publicKey;
cert.serialNumber = "123456";
cert.validity.notBefore = new Date("2020-01-01T00:00:00Z");
cert.validity.notAfter = new Date("2030-01-01T00:00:00Z");
cert.setSubject([{ name: "commonName", value: "example.test" }, { name: "organizationName", value: "Example" }]);
cert.setIssuer(cert.subject.attributes);
cert.setExtensions([
  { name: "basicConstraints", cA: false, critical: true },
  { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
  { name: "extKeyUsage", serverAuth: true },
  { name: "subjectAltName", altNames: [{ type: 2, value: "example.test" }, { type: 7, ip: "127.0.0.1" }] },
]);
cert.sign(pair.privateKey, forge.md.sha256.create());
const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(pair.privateKey);
const der = (binary: string) => Uint8Array.from(binary, c => c.charCodeAt(0)).buffer;
const certificateDer = der(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
  setEngine("test", new CryptoEngine({ crypto: webcrypto as unknown as Crypto }));
});

describe("certificate inspection", () => {
  it("reads PEM fields and extensions, and matches Node's independent fingerprints", async () => {
    const output = await inspectCertificates([{ name: "pasted", data: certPem }], "", new Date("2026-01-01"));
    const independent = new X509Certificate(certPem);
    expect(output).toContain("CN=example.test, O=Example");
    expect(output).toContain("Version: 3");
    expect(output).toContain("Serial Number: 12:34:56");
    expect(output).toContain("Within validity period");
    expect(output).toContain("sha256WithRSAEncryption");
    expect(output).toContain("CA:FALSE");
    expect(output).toContain("Digital Signature, Key Encipherment");
    expect(output).toContain("DNS:example.test, IP Address:127.0.0.1");
    expect(output).toContain("TLS Web Server Authentication");
    expect(output).toContain(independent.fingerprint256);
    expect(output).toContain(independent.fingerprint);
    expect(output).toContain("Private key: none supplied");
  });
  it("reads DER and all certificates in a PEM chain", async () => {
    const output = await inspectCertificates([{ name: "cert.der", data: certificateDer }, { name: "chain.pem", data: certPem + certPem }]);
    expect(output).toContain("Certificate 3\nCertificate:");
    expect(output).not.toContain("Certificate 4\n");
  });
  it.each(["2019-01-01", "2031-01-01"])("reports date status at %s", async (now) => {
    const output = await inspectCertificates([{ name: "cert", data: certPem }], "", new Date(now));
    expect(output).toContain(now.startsWith("2019") ? "Not yet valid" : "Expired");
  });
  it("matches RSA keys and excludes every private RSA component", async () => {
    const output = await inspectCertificates([{ name: "bundle", data: certPem + keyPem }]);
    expect(output).toContain("Size: 1024 bits");
    expect(output).toContain("Certificate match: Certificate 1");
    for (const secret of [pair.privateKey.d, pair.privateKey.p, pair.privateKey.q, pair.privateKey.dP, pair.privateKey.dQ, pair.privateKey.qInv]) {
      const privateHex = secret.toString(16).padStart(Math.ceil(secret.toString(16).length / 2) * 2, "0").match(/.{2}/g)!.join(":").toUpperCase();
      expect(output).not.toContain(privateHex);
    }
    expect(output).not.toContain("BEGIN RSA PRIVATE KEY");
  });
  it("detects a mismatched RSA key", async () => {
    const other = forge.pki.rsa.generateKeyPair(1024);
    const output = await inspectCertificates([{ name: "bundle", data: certPem + forge.pki.privateKeyToPem(other.privateKey) }]);
    expect(output).toContain("Does not match any supplied certificate");
  });
  it.each(["aes256", "3des"] as const)("decrypts password-protected PKCS#12 (%s)", async algorithm => {
    const p12 = forge.pkcs12.toPkcs12Asn1(pair.privateKey, [cert, cert], "test password", { algorithm });
    const data = der(forge.asn1.toDer(p12).getBytes());
    const output = await inspectCertificates([{ name: "bundle.pfx", data }], "test password");
    expect(output).toContain("Certificate 2\n");
    expect(output).toContain("Certificate match: Certificate 1, 2");
    await expect(inspectCertificates([{ name: "bundle.p12", data }], "wrong")).rejects.toThrow("Check the password");
  });
  it("supports empty-password PKCS#12 and DER auto-detection", async () => {
    const p12 = forge.pkcs12.toPkcs12Asn1(pair.privateKey, cert, "", { algorithm: "aes256" });
    expect(await inspectCertificates([{ name: "unknown.bin", data: der(forge.asn1.toDer(p12).getBytes()) }])).toContain("Certificate match: Certificate 1");
  });
  it("supports absent-password PKCS#12 without disabling integrity verification", async () => {
    const p12 = forge.pkcs12.toPkcs12Asn1(pair.privateKey, cert, null, { algorithm: "3des" });
    const encoded = forge.asn1.toDer(p12).getBytes();
    // The empty-string encoding fails even though this is a valid passwordless bundle.
    expect(() => forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(encoded), true, "")).toThrow("MAC could not be verified");
    const data = der(encoded);
    const output = await inspectCertificates([{ name: "passwordless.pfx", data }]);
    expect(output).toContain("CN=example.test");
    expect(output).toContain("Certificate match: Certificate 1");
    expect(output).not.toContain("no integrity MAC");
    // An explicit nonempty password must not fall back to passwordless opening.
    await expect(inspectCertificates([{ name: "passwordless.pfx", data }], "wrong")).rejects.toThrow("Check the password");
    const damaged = Uint8Array.from(new Uint8Array(data));
    damaged[damaged.length - 25] ^= 1;
    await expect(inspectCertificates([{ name: "damaged.pfx", data: damaged.buffer }])).rejects.toThrow();
  });
  it.each([false, true])("decrypts encrypted PEM RSA keys (legacy=%s)", async legacy => {
    const encrypted = forge.pki.encryptRsaPrivateKey(pair.privateKey, "secret password", { algorithm: "aes256", legacy });
    const inputs = [{ name: "cert", data: certPem + encrypted }];
    expect(await inspectCertificates(inputs, "secret password")).toContain("Certificate match: Certificate 1");
    await expect(inspectCertificates(inputs, "wrong")).rejects.toThrow();
  });
  it.each(["ec", "ed25519"] as const)("reads and matches %s certificates and PKCS#8 keys", async type => {
    const pair = type === "ec" ? generateKeyPairSync("ec", { namedCurve: "prime256v1" }) : generateKeyPairSync("ed25519");
    const certificate = new Certificate();
    certificate.version = 2;
    certificate.serialNumber = new asn1js.Integer({ value: 7 });
    certificate.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: "elliptic.test" }) }));
    certificate.issuer = certificate.subject;
    certificate.notBefore.value = new Date("2020-01-01");
    certificate.notAfter.value = new Date("2030-01-01");
    const publicDer = pair.publicKey.export({ type: "spki", format: "der" });
    certificate.subjectPublicKeyInfo.fromSchema(asn1js.fromBER(publicDer).result);
    const privatePem = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const key = await webcrypto.subtle.importKey("pkcs8", pair.privateKey.export({ type: "pkcs8", format: "der" }), type === "ec" ? { name: "ECDSA", namedCurve: "P-256" } : { name: "Ed25519" }, false, ["sign"]);
    if (type === "ec") await certificate.sign(key as CryptoKey, "SHA-256");
    else {
      certificate.signature = certificate.signatureAlgorithm = new AlgorithmIdentifier({ algorithmId: "1.3.101.112" });
      const tbs = certificate.encodeTBS().toBER(false);
      certificate.signatureValue = new asn1js.BitString({ valueHex: Uint8Array.from(sign(null, Buffer.from(tbs), pair.privateKey)).buffer });
    }
    const certificateData = certificate.toSchema(true).toBER(false);
    const output = await inspectCertificates([{ name: "ec.der", data: certificateData }, { name: "key.pem", data: privatePem }]);
    expect(output).toContain("CN=elliptic.test");
    expect(output).toContain(type === "ec" ? "P-256" : "Ed25519");
    expect(output).toContain("Certificate match: Certificate 1");
    expect(output).not.toContain(privatePem);
    // Exercise Forge's ASN.1 fallback for non-RSA keys/certificates inside PKCS#12.
    const sequence = (...value: asn1js.AsnType[]) => new asn1js.Sequence({ value });
    const oid = (value: string) => new asn1js.ObjectIdentifier({ value });
    const explicit = (value: asn1js.AsnType) => new asn1js.Constructed({ idBlock: { tagClass: 3, tagNumber: 0 }, value: [value] });
    const octets = (valueHex: ArrayBuffer) => new asn1js.OctetString({ valueHex });
    const content = (data: ArrayBuffer) => sequence(oid("1.2.840.113549.1.7.1"), explicit(octets(data)));
    const keySchema = asn1js.fromBER(pair.privateKey.export({ type: "pkcs8", format: "der" })).result;
    const safe = sequence(
      sequence(oid("1.2.840.113549.1.12.10.1.3"), explicit(sequence(oid("1.2.840.113549.1.9.22.1"), explicit(octets(certificateData))))),
      sequence(oid("1.2.840.113549.1.12.10.1.1"), explicit(keySchema)),
    );
    const p12 = sequence(new asn1js.Integer({ value: 3 }), content(sequence(content(safe.toBER(false))).toBER(false))).toBER(false);
    const bundleReport = await inspectCertificates([{ name: "elliptic.p12", data: p12 }]);
    expect(bundleReport).toContain("Certificate match: Certificate 1");
    expect(bundleReport).toContain("PKCS#12 bundle has no integrity MAC");
    expect(bundleReport).toContain(type === "ec" ? "P-256" : "Ed25519");
    if (type === "ec") {
      const sec1 = pair.privateKey.export({ type: "sec1", format: "pem" }).toString();
      expect(await inspectCertificates([{ name: "cert.der", data: certificateData }, { name: "key.pem", data: sec1 }])).toContain("Certificate match: Certificate 1");
    }
    expect(output).toContain(createHash("sha256").update(new Uint8Array(certificateData)).digest("hex").match(/.{2}/g)!.join(":").toUpperCase());
  });
  it("rejects malformed data, key-only input, unsupported PEM, and oversized input", async () => {
    await expect(inspectCertificates([{ name: "bad", data: "not a certificate" }])).rejects.toThrow("Paste PEM");
    await expect(inspectCertificates([{ name: "bad.der", data: new Uint8Array([1, 2, 3]).buffer }])).rejects.toThrow();
    await expect(inspectCertificates([{ name: "key", data: keyPem }])).rejects.toThrow("No X.509 certificates");
    await expect(inspectCertificates([{ name: "unknown", data: forge.pem.encode({ type: "PUBLIC KEY", body: "a" }) }])).rejects.toThrow("Unsupported PEM block");
    await expect(inspectCertificates([{ name: "huge", data: new ArrayBuffer(MAX_INPUT_BYTES + 1) }])).rejects.toThrow("5 MiB");
    await expect(inspectCertificates([{ name: "truncated", data: certificateDer.slice(0, -2) }])).rejects.toThrow();
  });
});
