export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface PlainFilterClause {
  type: "plain";
  name: string;
}

export interface BracketFilterClause {
  type: "bracket";
  name: string;
  children: FilterClause[];
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
    this.skipWhitespace();
    return this.atEnd() ? [] : this.parseClauseList();
  }

  private parseClauseList(terminator?: "]"): FilterClause[] {
    const clauses: FilterClause[] = [];

    while (!this.atEnd()) {
      clauses.push(this.parseClause());
      this.skipWhitespace();

      if (terminator && this.peek() === terminator) {
        this.position += 1;
        return clauses;
      }
      if (this.atEnd()) {
        if (terminator) this.fail("Unclosed bracket selector");
        return clauses;
      }
      if (this.peek() !== ",") {
        this.fail(terminator ? "Expected ',' or ']' in bracket selector" : "Expected ',' between filter clauses");
      }

      this.position += 1;
      this.skipWhitespace();
      if (this.atEnd() || (terminator && this.peek() === terminator)) {
        this.fail("Expected a filter clause after ','");
      }
    }

    this.fail(terminator ? "Unclosed bracket selector" : "Expected a filter clause");
  }

  private parseClause(): FilterClause {
    const name = this.parseName();
    this.skipWhitespace();

    if (this.peek() !== "[") return { type: "plain", name };

    this.position += 1;
    this.skipWhitespace();
    if (this.peek() === "]") this.fail("Bracket selectors must contain at least one clause");
    if (this.atEnd()) this.fail("Unclosed bracket selector");

    return { type: "bracket", name, children: this.parseClauseList("]") };
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

interface NamePattern {
  exactName: string | null;
  segments: string[];
  startsWithWildcard: boolean;
  endsWithWildcard: boolean;
}

function compileNamePattern(name: string): NamePattern {
  const normalized = normalizeName(name);
  const hasWildcard = normalized.includes("*");
  return {
    exactName: hasWildcard ? null : normalized,
    segments: normalized.split("*"),
    startsWithWildcard: normalized.startsWith("*"),
    endsWithWildcard: normalized.endsWith("*"),
  };
}

function matchesNamePattern(name: string, pattern: NamePattern): boolean {
  const normalized = normalizeName(name);
  if (pattern.exactName !== null) return normalized === pattern.exactName;

  const segments = pattern.segments.filter(Boolean);

  if (segments.length === 0) return true;

  let position = 0;
  for (const [index, segment] of segments.entries()) {
    if (index === 0 && !pattern.startsWithWildcard) {
      if (!normalized.startsWith(segment)) return false;
      position = segment.length;
      continue;
    }

    const matchPosition = normalized.indexOf(segment, position);
    if (matchPosition === -1) return false;
    position = matchPosition + segment.length;
  }

  return pattern.endsWithWildcard || normalized.endsWith(segments.at(-1) ?? "");
}

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function filterJson(value: JsonValue, clauses: FilterClause[]): FilterResult {
  interface CompiledClause {
    type: FilterClause["type"];
    pattern: NamePattern;
    recursive: boolean;
    children?: CompiledClause[];
  }

  function compileClause(clause: FilterClause): CompiledClause {
    return {
      type: clause.type,
      pattern: compileNamePattern(clause.name),
      recursive: clause.type === "bracket" && clause.name === "*",
      children: clause.type === "bracket" ? clause.children.map(compileClause) : undefined,
    };
  }

  const globalClauses = clauses.map(compileClause);

  function visit(current: JsonValue, directClauses?: readonly CompiledClause[]): FilterResult {
    if (Array.isArray(current)) {
      const result: JsonValue[] = [];
      for (const item of current) {
        const filtered = visit(item, directClauses);
        if (filtered.matched) result.push(filtered.value);
      }
      return { matched: result.length > 0, value: result };
    }

    if (!isObject(current)) return { matched: false, value: null };

    const result: { [key: string]: JsonValue } = {};
    let matched = false;

    for (const [key, child] of Object.entries(current)) {
      const matchingGlobalClauses = globalClauses.filter((clause) =>
        matchesNamePattern(key, clause.pattern),
      );
      const matchingDirectClauses =
        directClauses?.filter((clause) => matchesNamePattern(key, clause.pattern)) ?? [];
      const matchingClauses = [...matchingGlobalClauses, ...matchingDirectClauses];

      if (matchingClauses.some((clause) => clause.type === "plain")) {
        result[key] = child;
        matched = true;
        continue;
      }

      const childClauses = matchingClauses.flatMap((clause) => clause.children ?? []);
      const recursiveClauses = matchingDirectClauses.filter((clause) => clause.recursive);
      const nextDirectClauses = [...childClauses, ...recursiveClauses];
      const filtered = visit(child, nextDirectClauses.length > 0 ? nextDirectClauses : undefined);
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
