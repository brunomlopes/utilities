import * as asn1js from "asn1js";
import { AlgorithmIdentifier, Certificate, ECPrivateKey, PrivateKeyInfo, RSAPrivateKey, RSAPublicKey } from "pkijs";
import forge from "node-forge";

export const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export interface InspectionInput { name: string; data: string | ArrayBuffer }

const names: Record<string, string> = {
  "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST",
  "2.5.4.10": "O", "2.5.4.11": "OU", "2.5.4.5": "serialNumber",
  "1.2.840.113549.1.9.1": "emailAddress", "0.9.2342.19200300.100.1.25": "DC",
  "1.2.840.113549.1.1.1": "rsaEncryption", "1.2.840.113549.1.1.10": "RSASSA-PSS",
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption", "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption", "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
  "1.2.840.10045.2.1": "id-ecPublicKey", "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
  "1.2.840.10045.4.3.3": "ecdsa-with-SHA384", "1.2.840.10045.4.3.4": "ecdsa-with-SHA512",
  "1.3.101.112": "Ed25519", "1.3.101.113": "Ed448", "1.3.101.110": "X25519", "1.3.101.111": "X448",
  "1.2.840.10045.3.1.7": "P-256", "1.3.132.0.34": "P-384", "1.3.132.0.35": "P-521",
  "1.3.132.0.10": "secp256k1", "2.5.29.14": "Subject Key Identifier",
  "2.5.29.15": "Key Usage", "2.5.29.17": "Subject Alternative Name", "2.5.29.18": "Issuer Alternative Name",
  "2.5.29.19": "Basic Constraints", "2.5.29.31": "CRL Distribution Points",
  "2.5.29.32": "Certificate Policies", "2.5.29.35": "Authority Key Identifier",
  "2.5.29.37": "Extended Key Usage", "1.3.6.1.5.5.7.1.1": "Authority Information Access",
  "1.3.6.1.5.5.7.3.1": "TLS Web Server Authentication", "1.3.6.1.5.5.7.3.2": "TLS Web Client Authentication",
  "1.3.6.1.5.5.7.3.3": "Code Signing", "1.3.6.1.5.5.7.3.4": "Email Protection",
  "1.3.6.1.5.5.7.3.8": "Time Stamping", "1.3.6.1.5.5.7.3.9": "OCSP Signing",
  "1.3.6.1.5.5.7.48.1": "OCSP", "1.3.6.1.5.5.7.48.2": "CA Issuers",
};
const oidName = (oid: string) => names[oid] ? `${names[oid]} (${oid})` : oid;
const hex = (buffer: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join(":").toUpperCase();
const binary = (data: ArrayBuffer) => Array.from(new Uint8Array(data), b => String.fromCharCode(b)).join("");
const bytes = (data: string): ArrayBuffer => Uint8Array.from(data, c => c.charCodeAt(0)).buffer;

function schema(data: ArrayBuffer) {
  const decoded = asn1js.fromBER(data);
  if (decoded.offset === -1 || decoded.offset !== data.byteLength) throw new Error("Invalid or truncated ASN.1 data.");
  return decoded.result;
}
function integerBits(integer: asn1js.Integer) {
  const value = new Uint8Array(integer.valueBlock.valueHexView);
  const first = value.findIndex(b => b !== 0);
  return first < 0 ? 0 : (value.length - first - 1) * 8 + (32 - Math.clz32(value[first]));
}
function curve(algorithm: AlgorithmIdentifier) {
  return algorithm.algorithmParams instanceof asn1js.ObjectIdentifier ? algorithm.algorithmParams.valueBlock.toString() : "";
}
function describeAsn1(value: asn1js.AsnType, depth = 0): string {
  if (depth > 15) return "[nested value]";
  if (value instanceof asn1js.ObjectIdentifier) return oidName(value.valueBlock.toString());
  if (value instanceof asn1js.Boolean) return String(value.valueBlock.value);
  if (value instanceof asn1js.Integer) return hex(value.valueBlock.valueHexView);
  if ("value" in value.valueBlock && typeof value.valueBlock.value === "string") return value.valueBlock.value;
  if ("value" in value.valueBlock && Array.isArray(value.valueBlock.value)) {
    return value.valueBlock.value.map(child => "idBlock" in child ? describeAsn1(child as asn1js.AsnType, depth + 1) : "[unrecognized value]").join(", ");
  }
  if ("valueHexView" in value.valueBlock) {
    const raw = value.valueBlock.valueHexView as Uint8Array;
    if (value.idBlock.tagClass === 3 && [1, 2, 6].includes(value.idBlock.tagNumber)) {
      return `${({ 1: "email", 2: "DNS", 6: "URI" } as Record<number, string>)[value.idBlock.tagNumber]}:${new TextDecoder().decode(raw)}`;
    }
    if (value.idBlock.tagClass === 3 && value.idBlock.tagNumber === 7) {
      return `IP Address:${raw.length === 4 ? Array.from(raw).join(".") : hex(raw).replace(/:/g, "").match(/.{1,4}/g)?.join(":")}`;
    }
    return hex(raw);
  }
  return value.constructor.name;
}
function extensionText(id: string, data: ArrayBuffer) {
  try {
    const value = schema(data);
    if (id === "2.5.29.19" && value instanceof asn1js.Sequence) {
      const ca = value.valueBlock.value.find(v => v instanceof asn1js.Boolean);
      const path = value.valueBlock.value.find(v => v instanceof asn1js.Integer);
      return `CA:${ca instanceof asn1js.Boolean && ca.valueBlock.value ? "TRUE" : "FALSE"}${path instanceof asn1js.Integer ? `, pathlen:${path.valueBlock.valueDec}` : ""}`;
    }
    if (id === "2.5.29.15" && value instanceof asn1js.BitString) {
      const labels = ["Digital Signature", "Non Repudiation", "Key Encipherment", "Data Encipherment", "Key Agreement", "Certificate Sign", "CRL Sign", "Encipher Only", "Decipher Only"];
      return labels.filter((_, i) => (value.valueBlock.valueHexView[Math.floor(i / 8)] & (128 >> (i % 8))) !== 0).join(", ");
    }
    return describeAsn1(value);
  } catch { return `DER: ${hex(data)}`; }
}

function privateKey(data: ArrayBuffer, label = "PRIVATE KEY"): PrivateKeyInfo {
  if (label === "RSA PRIVATE KEY") {
    const rsa = new RSAPrivateKey({ schema: schema(data) });
    return new PrivateKeyInfo({ privateKeyAlgorithm: new AlgorithmIdentifier({ algorithmId: "1.2.840.113549.1.1.1", algorithmParams: new asn1js.Null() }), privateKey: new asn1js.OctetString({ valueHex: rsa.toSchema().toBER(false) }), parsedKey: rsa });
  }
  if (label === "EC PRIVATE KEY") {
    const ec = new ECPrivateKey({ schema: schema(data) });
    if (!ec.namedCurve) throw new Error("EC key is missing its named curve.");
    return new PrivateKeyInfo({ privateKeyAlgorithm: new AlgorithmIdentifier({ algorithmId: "1.2.840.10045.2.1", algorithmParams: new asn1js.ObjectIdentifier({ value: ec.namedCurve }) }), privateKey: new asn1js.OctetString({ valueHex: ec.toSchema().toBER(false) }), parsedKey: ec });
  }
  return new PrivateKeyInfo({ schema: schema(data) });
}
function keyDescription(key: PrivateKeyInfo) {
  const algorithm = key.privateKeyAlgorithm;
  let details = `Algorithm: ${oidName(algorithm.algorithmId)}`;
  if (key.parsedKey instanceof RSAPrivateKey) details += `\n    Size: ${integerBits(key.parsedKey.modulus)} bits\n    Public exponent: ${key.parsedKey.publicExponent.valueBlock.valueDec}`;
  const namedCurve = curve(algorithm);
  if (namedCurve) details += `\n    Named curve: ${oidName(namedCurve)}`;
  if (algorithm.algorithmId === "1.3.101.112") details += "\n    Size: 256 bits";
  if (algorithm.algorithmId === "1.3.101.113") details += "\n    Size: 456 bits";
  return details;
}
async function matches(key: PrivateKeyInfo, cert: Certificate): Promise<boolean | null> {
  const id = key.privateKeyAlgorithm.algorithmId;
  if (id !== cert.subjectPublicKeyInfo.algorithm.algorithmId) return false;
  if (key.parsedKey instanceof RSAPrivateKey && cert.subjectPublicKeyInfo.parsedKey instanceof RSAPublicKey) {
    const publicKey = cert.subjectPublicKeyInfo.parsedKey;
    return hex(key.parsedKey.modulus.valueBlock.valueHexView) === hex(publicKey.modulus.valueBlock.valueHexView) && key.parsedKey.publicExponent.valueBlock.valueDec === publicKey.publicExponent.valueBlock.valueDec;
  }
  try {
    let algorithm: EcKeyImportParams | Algorithm;
    let signing: Algorithm | EcdsaParams;
    if (id === "1.2.840.10045.2.1") {
      const namedCurve = names[curve(key.privateKeyAlgorithm)];
      if (!namedCurve || !["P-256", "P-384", "P-521"].includes(namedCurve)) return null;
      algorithm = { name: "ECDSA", namedCurve };
      signing = { name: "ECDSA", hash: "SHA-256" };
    } else if (id === "1.3.101.112" || id === "1.3.101.113") {
      algorithm = signing = { name: names[id] };
    } else return null;
    const signingKey = await crypto.subtle.importKey("pkcs8", key.toSchema().toBER(false), algorithm as EcKeyImportParams, false, ["sign"]);
    const verifyingKey = await crypto.subtle.importKey("spki", cert.subjectPublicKeyInfo.toSchema().toBER(false), algorithm as EcKeyImportParams, false, ["verify"]);
    const challenge = new TextEncoder().encode("certificate-inspector key pairing");
    const signature = await crypto.subtle.sign(signing, signingKey, challenge);
    return await crypto.subtle.verify(signing, verifyingKey, signature, challenge);
  } catch { return null; }
}
async function certificateText(cert: Certificate, data: ArrayBuffer, now: Date) {
  const dn = (name: Certificate["subject"]) => name.typesAndValues.map(attribute => `${names[attribute.type] ?? attribute.type}=${describeAsn1(attribute.value)}`).join(", ");
  const publicKey = cert.subjectPublicKeyInfo;
  const lines = ["Certificate:", "    Data:", `        Version: ${cert.version + 1} (0x${cert.version.toString(16)})`, `        Serial Number: ${hex(cert.serialNumber.valueBlock.valueHexView)}`, `        Signature Algorithm: ${oidName(cert.signature.algorithmId)}`, `        Issuer: ${dn(cert.issuer)}`, "        Validity", `            Not Before: ${cert.notBefore.value.toUTCString()}`, `            Not After : ${cert.notAfter.value.toUTCString()}`, `            Date status: ${now < cert.notBefore.value ? "Not yet valid" : now > cert.notAfter.value ? "Expired" : "Within validity period"}`, `        Subject: ${dn(cert.subject)}`, "        Subject Public Key Info:", `            Public Key Algorithm: ${oidName(publicKey.algorithm.algorithmId)}`];
  if (publicKey.parsedKey instanceof RSAPublicKey) {
    lines.push(`            Public-Key: (${integerBits(publicKey.parsedKey.modulus)} bit)`, `            Modulus: ${hex(publicKey.parsedKey.modulus.valueBlock.valueHexView)}`, `            Exponent: ${publicKey.parsedKey.publicExponent.valueBlock.valueDec}`);
  } else {
    if (curve(publicKey.algorithm)) lines.push(`            Named curve: ${oidName(curve(publicKey.algorithm))}`);
    lines.push(`            Public key: ${hex(publicKey.subjectPublicKey.valueBlock.valueHexView)}`);
  }
  if (cert.extensions?.length) {
    lines.push("        X509v3 extensions:");
    for (const ext of cert.extensions) lines.push(`            ${oidName(ext.extnID)}${ext.critical ? ": critical" : ":"}`, `                ${extensionText(ext.extnID, ext.extnValue.valueBlock.valueHexView.slice().buffer)}`);
  }
  lines.push(`    Signature Algorithm: ${oidName(cert.signatureAlgorithm.algorithmId)}`);
  if (cert.signatureAlgorithm.algorithmParams && !(cert.signatureAlgorithm.algorithmParams instanceof asn1js.Null)) lines.push(`    Signature Parameters: ${describeAsn1(cert.signatureAlgorithm.algorithmParams)}`);
  lines.push(`    Signature Value: ${hex(cert.signatureValue.valueBlock.valueHexView)}`);
  for (const hash of ["SHA-256", "SHA-1"]) lines.push(`    ${hash} Fingerprint: ${hex(await crypto.subtle.digest(hash, data))}`);
  return lines.join("\n");
}

/** Returns certificate data and allowlisted key metadata only; never serializes private key material. */
export async function inspectCertificates(inputs: InspectionInput[], password = "", now = new Date()): Promise<string> {
  if (!crypto.subtle) throw new Error("Web Crypto is unavailable. Open this tool over HTTPS or localhost.");
  const certificates: { cert: Certificate; data: ArrayBuffer }[] = [];
  const keys: PrivateKeyInfo[] = [];
  const warnings: string[] = [];
  const addCert = (data: ArrayBuffer) => certificates.push({ cert: new Certificate({ schema: schema(data) }), data });
  const addP12 = (data: ArrayBuffer) => {
    try {
      const encoded = binary(data);
      const pfx = forge.asn1.fromDer(encoded);
      let p12: forge.pkcs12.Pkcs12Pfx;
      try {
        p12 = forge.pkcs12.pkcs12FromAsn1(pfx, true, password);
      } catch (error) {
        if (password !== "") throw error;
        // PKCS#12 distinguishes an empty password from an absent password.
        // Reparse for the absent-password attempt because Forge can mutate ASN.1.
        // Both attempts still verify any integrity MAC and decrypt normally.
        p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(encoded), true, undefined);
      }
      for (const safe of p12.safeContents) for (const bag of safe.safeBags) {
        if (bag.type === forge.pki.oids.certBag) {
          const value = bag.asn1 ?? (bag.cert ? forge.pki.certificateToAsn1(bag.cert) : undefined);
          if (!value) throw new Error("Missing certificate");
          addCert(bytes(forge.asn1.toDer(value).getBytes()));
        } else if (bag.type === forge.pki.oids.keyBag || bag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
          const value = bag.asn1 ?? (bag.key ? forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(bag.key)) : undefined);
          if (!value) throw new Error("Missing private key");
          keys.push(privateKey(bytes(forge.asn1.toDer(value).getBytes())));
        }
      }
      if (Array.isArray(pfx.value) && pfx.value.length < 3) warnings.push("PKCS#12 bundle has no integrity MAC.");
    } catch { throw new Error("Cannot open PKCS#12 bundle. Check the password; the bundle may be damaged or use unsupported encryption."); }
  };
  for (const input of inputs) {
    const size = typeof input.data === "string" ? new TextEncoder().encode(input.data).length : input.data.byteLength;
    if (size > MAX_INPUT_BYTES) throw new Error("Each input must be no larger than 5 MiB.");
    const text = typeof input.data === "string" ? input.data : new TextDecoder().decode(input.data);
    try {
      if (text.includes("-----BEGIN")) {
        const blocks = forge.pem.decode(text);
        if (!blocks.length) throw new Error("No PEM blocks");
        for (const block of blocks) {
          const data = bytes(block.body);
          if (block.type === "CERTIFICATE") addCert(data);
          else if (["PKCS12", "PFX"].includes(block.type)) addP12(data);
          else if (block.type === "ENCRYPTED PRIVATE KEY") {
            const decrypted = forge.pki.decryptPrivateKeyInfo(forge.asn1.fromDer(block.body), password);
            if (!decrypted) throw new Error("Cannot decrypt private key. Check the password.");
            keys.push(privateKey(bytes(forge.asn1.toDer(decrypted).getBytes())));
          } else if (["PRIVATE KEY", "RSA PRIVATE KEY", "EC PRIVATE KEY"].includes(block.type)) {
            if (block.procType?.type === "ENCRYPTED") {
              if (block.type !== "RSA PRIVATE KEY") throw new Error("Legacy encrypted EC keys are unsupported. Convert to encrypted PKCS#8.");
              const decrypted = forge.pki.decryptRsaPrivateKey(forge.pem.encode(block), password);
              if (!decrypted) throw new Error("Cannot decrypt private key. Check the password.");
              keys.push(privateKey(bytes(forge.asn1.toDer(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(decrypted))).getBytes())));
            } else keys.push(privateKey(data, block.type));
          } else throw new Error(`Unsupported PEM block: ${block.type}. Supply an X.509 certificate or private key.`);
        }
      } else {
        if (typeof input.data === "string") throw new Error("Paste PEM text or upload a DER/PKCS#12 file.");
        if (/\.(p12|pfx)$/i.test(input.name)) addP12(input.data);
        else {
          try { addCert(input.data); }
          catch { addP12(input.data); }
        }
      }
    } catch (error) {
      // Do not include arbitrary library exceptions, which could contain secret material.
      const message = error instanceof Error && /^(Cannot |Unsupported PEM|Legacy encrypted|Paste PEM)/.test(error.message) ? error.message : "Invalid certificate or key, incorrect password, or unsupported encoding.";
      throw new Error(message);
    }
  }
  if (!certificates.length) throw new Error("No X.509 certificates found. Include at least one certificate.");
  const sections = ["Certificate Inspector", "Inspection only: trust, certificate signatures, chains, and revocation are not verified."];
  sections.push(...warnings);
  for (const [index, entry] of certificates.entries()) sections.push(`Certificate ${index + 1}\n${await certificateText(entry.cert, entry.data, now)}`);
  for (const [index, key] of keys.entries()) {
    const matching: number[] = [];
    let unavailable = false;
    for (const [certIndex, entry] of certificates.entries()) {
      const match = await matches(key, entry.cert);
      if (match) matching.push(certIndex + 1);
      if (match === null) unavailable = true;
    }
    sections.push(`Private Key ${index + 1} (metadata only):\n    ${keyDescription(key)}\n    Certificate match: ${matching.length ? `Certificate ${matching.join(", ")}` : unavailable ? "Could not determine for this algorithm/browser" : "Does not match any supplied certificate"}\n    Private values are never included in this report.`);
  }
  if (!keys.length) sections.push("Private key: none supplied.");
  return sections.join("\n\n");
}
