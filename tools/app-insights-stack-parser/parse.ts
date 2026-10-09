export interface ExceptionDetails {
  id: string | number;
  outerId: string | number;
  severityLevel: string | number;
  type: string;
  message: string;
  parsedStack: StackFrame[];
}

export interface StackFrame {
  method: string;
  fileName?: string;
  line?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseDetails(input: string): ExceptionDetails[] {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw new Error("Invalid JSON. Paste the complete details array from App Insights.");
  }
  if (!Array.isArray(value)) throw new Error("Details must be a JSON array of exception objects.");
  return value.map((item: unknown, index) => {
    const prefix = `Item ${index + 1}`;
    if (!isObject(item)) throw new Error(`${prefix} must be an exception object.`);
    for (const field of ["id", "outerId", "severityLevel"] as const) {
      if (typeof item[field] !== "string" && typeof item[field] !== "number") {
        throw new Error(`${prefix}: ${field} must be a string or number.`);
      }
    }
    for (const field of ["type", "message"] as const) {
      if (typeof item[field] !== "string") throw new Error(`${prefix}: ${field} must be a string.`);
    }
    if (!Array.isArray(item.parsedStack)) throw new Error(`${prefix}: parsedStack must be an array.`);
    const parsedStack = item.parsedStack.map((frame: unknown, frameIndex: number) => {
      const location = `${prefix}, frame ${frameIndex + 1}`;
      if (!isObject(frame) || typeof frame.method !== "string") {
        throw new Error(`${location}: method must be a string.`);
      }
      if (frame.fileName !== undefined && typeof frame.fileName !== "string") {
        throw new Error(`${location}: fileName must be a string.`);
      }
      if (frame.line !== undefined && (typeof frame.line !== "number" || !Number.isInteger(frame.line) || frame.line < 0)) {
        throw new Error(`${location}: line must be a non-negative integer.`);
      }
      return { method: frame.method, fileName: frame.fileName, line: frame.line } as StackFrame;
    });
    return { id: item.id, outerId: item.outerId, severityLevel: item.severityLevel, type: item.type, message: item.message, parsedStack } as ExceptionDetails;
  });
}

export function formatStack(frames: StackFrame[]): string {
  return frames.map(({ method, fileName, line }) =>
    `   at ${method}${fileName ? ` in ${fileName}${line && line > 0 ? `:line ${line}` : ""}` : ""}`,
  ).join("\n");
}
