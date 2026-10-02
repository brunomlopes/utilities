import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CertificateInspector } from "./certificate-inspector";

const inspect = vi.hoisted(() => vi.fn());
vi.mock("./inspect", () => ({ MAX_INPUT_BYTES: 5 * 1024 * 1024, inspectCertificates: inspect }));
beforeEach(() => { inspect.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("inspects pasted PEM with a masked password and copies only the report", async () => {
  inspect.mockResolvedValue("Certificate report, metadata only");
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  render(<CertificateInspector />);
  const password = screen.getByLabelText("Password for encrypted keys or bundles");
  expect(password).toHaveAttribute("type", "password");
  fireEvent.change(password, { target: { value: "secret password" } });
  fireEvent.change(screen.getByLabelText("PEM certificates and optional private keys"), { target: { value: "PEM with a secret key" } });
  await waitFor(() => expect(screen.getByLabelText("Inspection report")).toHaveValue("Certificate report, metadata only"));
  expect(inspect).toHaveBeenCalledWith([{ name: "Pasted PEM", data: "PEM with a secret key" }], "secret password");
  fireEvent.click(screen.getByRole("button", { name: "Copy report" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("Certificate report, metadata only"));
  fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
  expect(password).toHaveValue("");
  expect(screen.getByLabelText("Inspection report")).toHaveValue("");
  expect(screen.getByLabelText("PEM certificates and optional private keys")).toHaveValue("");
});

it("reads uploaded binary files locally and shows parsing errors", async () => {
  inspect.mockRejectedValue(new Error("Cannot open PKCS#12 bundle. Check the password."));
  render(<CertificateInspector />);
  const data = new Uint8Array([1, 2, 3]).buffer;
  const file = new File([data], "bundle.p12");
  Object.defineProperty(file, "arrayBuffer", { value: async () => data });
  fireEvent.change(screen.getByLabelText("Upload PEM, DER, .p12 or .pfx files"), { target: { files: [file] } });
  await screen.findByRole("alert");
  expect(inspect).toHaveBeenCalledWith([{ name: "bundle.p12", data }], "");
  expect(screen.getByRole("alert")).toHaveTextContent("Check the password");
  expect(screen.getByRole("button", { name: "Copy report" })).toBeDisabled();
});

it("discards in-flight results after Clear all", async () => {
  let resolve!: (value: string) => void;
  inspect.mockImplementation(() => new Promise<string>(done => { resolve = done; }));
  render(<CertificateInspector />);
  fireEvent.change(screen.getByLabelText("PEM certificates and optional private keys"), { target: { value: "PEM" } });
  await waitFor(() => expect(inspect).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
  resolve("Stale report");
  await waitFor(() => expect(screen.getByLabelText("Inspection report")).toHaveValue(""));
  expect(screen.getByRole("button", { name: "Inspect certificate" })).toBeDisabled();
});

it("invalidates the report when any input changes", async () => {
  inspect.mockResolvedValue("Current report");
  render(<CertificateInspector />);
  fireEvent.change(screen.getByLabelText("PEM certificates and optional private keys"), { target: { value: "PEM" } });
  await waitFor(() => expect(screen.getByLabelText("Inspection report")).toHaveValue("Current report"));
  fireEvent.change(screen.getByLabelText("Password for encrypted keys or bundles"), { target: { value: "changed" } });
  expect(screen.getByLabelText("Inspection report")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Copy report" })).toBeDisabled();
});

it("debounces password edits for one second after the latest change", async () => {
  inspect.mockResolvedValue("Report");
  render(<CertificateInspector />);
  fireEvent.change(screen.getByLabelText("PEM certificates and optional private keys"), { target: { value: "PEM" } });
  await waitFor(() => expect(screen.getByLabelText("Inspection report")).toHaveValue("Report"));
  inspect.mockClear();
  vi.useFakeTimers();
  const password = screen.getByLabelText("Password for encrypted keys or bundles");
  fireEvent.change(password, { target: { value: "typing" } });
  await act(() => vi.advanceTimersByTimeAsync(999));
  expect(inspect).not.toHaveBeenCalled();
  fireEvent.change(password, { target: { value: "pasted password" } });
  await act(() => vi.advanceTimersByTimeAsync(999));
  expect(inspect).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(inspect).toHaveBeenCalledExactlyOnceWith([{ name: "Pasted PEM", data: "PEM" }], "pasted password");
  expect(screen.getByLabelText("Inspection report")).toHaveValue("Report");
});

it.each(["clear", "unmount"])("cancels a pending password inspection on %s", async action => {
  inspect.mockResolvedValue("Report");
  const view = render(<CertificateInspector />);
  fireEvent.change(screen.getByLabelText("PEM certificates and optional private keys"), { target: { value: "PEM" } });
  await waitFor(() => expect(inspect).toHaveBeenCalledOnce());
  inspect.mockClear();
  vi.useFakeTimers();
  fireEvent.change(screen.getByLabelText("Password for encrypted keys or bundles"), { target: { value: "pending" } });
  if (action === "clear") fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
  else view.unmount();
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(inspect).not.toHaveBeenCalled();
});

it("inspects new PEM immediately with the latest password and cancels its pending timer", async () => {
  inspect.mockResolvedValue("Report");
  render(<CertificateInspector />);
  const pem = screen.getByLabelText("PEM certificates and optional private keys");
  fireEvent.change(pem, { target: { value: "OLD PEM" } });
  await waitFor(() => expect(inspect).toHaveBeenCalledOnce());
  inspect.mockClear();
  vi.useFakeTimers();
  fireEvent.change(screen.getByLabelText("Password for encrypted keys or bundles"), { target: { value: "latest" } });
  fireEvent.change(pem, { target: { value: "NEW PEM" } });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(inspect).toHaveBeenCalledExactlyOnceWith([{ name: "Pasted PEM", data: "NEW PEM" }], "latest");
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(inspect).toHaveBeenCalledOnce();
});
