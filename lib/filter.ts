export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface PlainFilterClause {
  type: "plain";
  name: string;
}

export interface BracketFilterClause {
  type: "bracket";
  name: string;
  children: string[];
}

export type FilterClause = PlainFilterClause | BracketFilterClause;

export interface FilterResult {
  matched: boolean;
  value: JsonValue;
}

export class FilterSyntaxError extends Error {
  constructor(message: string, readonly position: number) {
    super(`${message} at character ${position + 1}`);
    this.name = "FilterSyntaxError";
  }
}

class FilterParser {
  private position = 0;

  constructor(private readonly source: string) {}

  parse(): FilterClause[] {
    const clauses: FilterClause[] = [];
    this.skipWhitespace();

    if (this.atEnd()) return clauses;

    while (!this.atEnd()) {
      const name = this.parseName();
      this.skipWhitespace();

      if (this.peek() === "[") {
        clauses.push({ type: "bracket", name, children: this.parseChildren() });
      } else {
        clauses.push({ type: "plain", name });
      }

      this.skipWhitespace();
      if (this.atEnd()) break;
      if (this.peek() !== ",") this.fail("Expected ',' between filter clauses");

      this.position += 1;
      this.skipWhitespace();
      if (this.atEnd()) this.fail("Expected a filter clause after ','");
    }

    return clauses;
  }

  private parseChildren(): string[] {
    this.position += 1;
    this.skipWhitespace();
    if (this.peek() === "]") this.fail("Bracket selectors must contain at least one name");

    const children: string[] = [];
    while (!this.atEnd()) {
      children.push(this.parseName());
      this.skipWhitespace();

      if (this.peek() === "]") {
        this.position += 1;
        return children;
      }
      if (this.peek() === "[") this.fail("Nested bracket selectors are not supported");
      if (this.peek() !== ",") this.fail("Expected ',' or ']' in bracket selector");

      this.position += 1;
      this.skipWhitespace();
      if (this.peek() === "]" || this.atEnd()) {
        this.fail("Expected a property name after ','");
      }
    }

    this.fail("Unclosed bracket selector");
  }

  private parseName(): string {
    this.skipWhitespace();
    if (this.atEnd()) this.fail("Expected a property name");
    if (this.peek() === '"') return this.parseQuotedName();
    if (this.peek() === "," || this.peek() === "[" || this.peek() === "]") {
      this.fail("Expected a property name");
    }

    const start = this.position;
    while (!this.atEnd() && !",[]".includes(this.peek())) {
      if (this.peek() === '"') this.fail("Quotes must surround the entire property name");
      this.position += 1;
    }

    const name = this.source.slice(start, this.position).trim();
    if (!name) this.fail("Property names cannot be empty");
    return name;
  }

  private parseQuotedName(): string {
    const start = this.position;
    this.position += 1;
    let escaped = false;

    while (!this.atEnd()) {
      const character = this.peek();
      this.position += 1;

      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === '"') {
        const literal = this.source.slice(start, this.position);
        try {
          return JSON.parse(literal) as string;
        } catch {
          this.fail("Invalid JSON string escape", start);
        }
      }
    }

    this.fail("Unclosed quoted property name", start);
  }

  private skipWhitespace(): void {
    while (!this.atEnd() && /\s/u.test(this.peek())) this.position += 1;
  }

  private peek(): string {
    return this.source[this.position] ?? "";
  }

  private atEnd(): boolean {
    return this.position >= this.source.length;
  }

  private fail(message: string, position = this.position): never {
    throw new FilterSyntaxError(message, position);
  }
}

export function parseFilter(expression: string): FilterClause[] {
  return new FilterParser(expression).parse();
}

function normalizeName(name: string): string {
  return name.toLowerCase();
}

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function filterJson(value: JsonValue, clauses: FilterClause[]): FilterResult {
  const plainNames = new Set<string>();
  const bracketNames = new Map<string, Set<string>>();

  for (const clause of clauses) {
    if (clause.type === "plain") {
      plainNames.add(normalizeName(clause.name));
      continue;
    }

    const parentName = normalizeName(clause.name);
    const children = bracketNames.get(parentName) ?? new Set<string>();
    for (const child of clause.children) children.add(normalizeName(child));
    bracketNames.set(parentName, children);
  }

  function visit(current: JsonValue, directNames?: ReadonlySet<string>): FilterResult {
    if (Array.isArray(current)) {
      const result: JsonValue[] = [];
      for (const item of current) {
        const filtered = visit(item);
        if (filtered.matched) result.push(filtered.value);
      }
      return { matched: result.length > 0, value: result };
    }

    if (!isObject(current)) return { matched: false, value: null };

    const result: { [key: string]: JsonValue } = {};
    let matched = false;

    for (const [key, child] of Object.entries(current)) {
      const normalizedKey = normalizeName(key);
      if (plainNames.has(normalizedKey) || directNames?.has(normalizedKey)) {
        result[key] = child;
        matched = true;
        continue;
      }

      const childDirectNames = isObject(child) ? bracketNames.get(normalizedKey) : undefined;
      const filtered = visit(child, childDirectNames);
      if (filtered.matched) {
        result[key] = filtered.value;
        matched = true;
      }
    }

    return { matched, value: result };
  }

  if (clauses.length === 0) return { matched: true, value };
  return visit(value);
}
