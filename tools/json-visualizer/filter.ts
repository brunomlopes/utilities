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

export interface EqualityFilterClause {
  type: "equality";
  name: string;
  expectedValue: string;
}

export interface PullFilterClause {
  type: "pull";
  name: string;
  pullDepth: "root" | number;
  destinationName?: string;
}

export interface RootFilterClause {
  type: "root";
  children: FilterClause[];
}

export type FilterClause =
  | PlainFilterClause
  | BracketFilterClause
  | EqualityFilterClause
  | PullFilterClause
  | RootFilterClause;

export interface FilterResult {
  matched: boolean;
  value: JsonValue;
  errors?: string[];
  overwriteErrors?: FilterOverwriteError[];
}

export interface FilterOverwriteError {
  message: string;
  propertyName: string;
  target: { [key: string]: JsonValue };
  itemNumber?: number;
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
      clauses.push(this.parseClause(terminator === undefined));
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

  private parseClause(allowRoot: boolean): FilterClause {
    const startsWithQuote = this.peek() === '"';
    const parsedName = this.parseName();
    this.skipWhitespace();

    const pull = startsWithQuote ? null : this.parsePullName(parsedName);

    if (this.peek() === "=") {
      if (pull) this.fail("Pull selectors cannot be combined with equality predicates");
      this.position += 1;
      return { type: "equality", name: parsedName, expectedValue: this.parseExpectedValue() };
    }

    if (this.peek() !== "[") {
      return pull
        ? {
            type: "pull",
            name: pull.name,
            pullDepth: pull.pullDepth,
            destinationName: pull.destinationName,
          }
        : { type: "plain", name: parsedName };
    }

    if (pull) this.fail("Pull selectors cannot contain bracket selectors");

    this.position += 1;
    this.skipWhitespace();
    if (this.peek() === "]") this.fail("Bracket selectors must contain at least one clause");
    if (this.atEnd()) this.fail("Unclosed bracket selector");

    if (parsedName === "$" && !startsWithQuote) {
      if (!allowRoot) this.fail("The root selector is only allowed at the top level");
      return { type: "root", children: this.parseClauseList("]") };
    }

    return { type: "bracket", name: parsedName, children: this.parseClauseList("]") };
  }

  private parsePullName(
    name: string,
  ): { name: string; pullDepth: "root" | number; destinationName?: string } | null {
    const firstOperator = name.search(/[!^]/u);
    if (firstOperator === -1) return null;

    const sourceName = name.slice(0, firstOperator).trim();
    if (!sourceName) this.fail("Pull selectors require a property name before the pull operator");

    const operator = name[firstOperator];
    let operatorEnd = firstOperator + 1;
    let pullDepth: "root" | number = "root";
    if (operator === "^") {
      while (name[operatorEnd] === "^") operatorEnd += 1;
      pullDepth = operatorEnd - firstOperator;
    }

    const destinationName = name.slice(operatorEnd).trim();
    if (/[!^]/u.test(destinationName)) {
      this.fail("Pull destination names cannot contain '!' or '^'");
    }

    return {
      name: sourceName,
      pullDepth,
      destinationName: destinationName || undefined,
    };
  }

  private parseName(): string {
    this.skipWhitespace();
    if (this.atEnd()) this.fail("Expected a property name");
    if (this.peek() === '"') return this.parseQuotedName();
    if (this.peek() === "," || this.peek() === "[" || this.peek() === "]") {
      this.fail("Expected a property name");
    }

    const start = this.position;
    while (!this.atEnd() && !",=[]".includes(this.peek())) {
      if (this.peek() === '"') this.fail("Quotes must surround the entire property name");
      this.position += 1;
    }

    const name = this.source.slice(start, this.position).trim();
    if (!name) this.fail("Property names cannot be empty");
    return name;
  }

  private parseExpectedValue(): string {
    this.skipWhitespace();
    if (this.atEnd() || ",[]".includes(this.peek())) {
      this.fail("Expected a comparison value after '='");
    }
    if (this.peek() === '"') return this.parseQuotedString("comparison value");

    const start = this.position;
    while (!this.atEnd() && !",[]".includes(this.peek())) {
      if (this.peek() === '"') this.fail("Quotes must surround the entire comparison value");
      this.position += 1;
    }

    const value = this.source.slice(start, this.position).trim();
    if (!value) this.fail("Comparison values cannot be empty", start);
    return value;
  }

  private parseQuotedName(): string {
    return this.parseQuotedString("property name");
  }

  private parseQuotedString(description: string): string {
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
          this.fail(`Invalid JSON string escape in ${description}`, start);
        }
      }
    }

    this.fail(`Unclosed quoted ${description}`, start);
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
    type: Exclude<FilterClause["type"], "root">;
    pattern: NamePattern;
    recursive: boolean;
    expectedValue?: string;
    pullDepth?: "root" | number;
    destinationName?: string;
    children?: CompiledClause[];
  }

  function compileClause(clause: FilterClause): CompiledClause {
    if (clause.type === "root") {
      throw new Error("Root selectors cannot be nested");
    }

    return {
      type: clause.type,
      pattern: compileNamePattern(clause.name),
      recursive: clause.type === "bracket" && clause.name === "*",
      expectedValue: clause.type === "equality" ? clause.expectedValue : undefined,
      pullDepth: clause.type === "pull" ? clause.pullDepth : undefined,
      destinationName: clause.type === "pull" ? clause.destinationName : undefined,
      children: clause.type === "bracket" ? clause.children.map(compileClause) : undefined,
    };
  }

  const globalClauses = clauses.filter((clause) => clause.type !== "root").map(compileClause);
  const rootClauses = clauses
    .filter((clause): clause is RootFilterClause => clause.type === "root")
    .flatMap((clause) => clause.children.map(compileClause));

  const errors: string[] = [];
  const overwriteErrors: FilterOverwriteError[] = [];

  interface PullTarget {
    value: { [key: string]: JsonValue };
    retained: boolean;
    itemNumber?: number;
  }

  interface VisitResult extends FilterResult {
    retained: boolean;
  }

  function formatValue(valueToFormat: JsonValue): string {
    return JSON.stringify(valueToFormat) ?? String(valueToFormat);
  }

  function assignFirst(
    target: PullTarget,
    key: string,
    child: JsonValue,
  ): boolean {
    if (Object.prototype.hasOwnProperty.call(target.value, key)) {
      const itemPrefix = target.itemNumber === undefined ? "" : `[Item #${target.itemNumber}] `;
      const message = `${itemPrefix}Property ${key} would be overwritten with value ${formatValue(child)}.`;
      errors.push(message);
      overwriteErrors.push({
        message,
        propertyName: key,
        target: target.value,
        itemNumber: target.itemNumber,
      });
      return false;
    }

    target.value[key] = child;
    return true;
  }

  function visit(
    current: JsonValue,
    directClauses?: readonly CompiledClause[],
    ancestorTargets: readonly PullTarget[] = [],
    rootItemNumber?: number,
  ): VisitResult {
    if (Array.isArray(current)) {
      const result: JsonValue[] = [];
      let matched = false;
      for (const item of current) {
        const filtered = visit(item, directClauses, ancestorTargets, rootItemNumber);
        matched ||= filtered.matched;
        if (filtered.retained) result.push(filtered.value);
      }
      return { matched, retained: result.length > 0, value: result };
    }

    if (!isObject(current)) return { matched: false, retained: false, value: null };

    const result: { [key: string]: JsonValue } = {};
    const currentTarget: PullTarget = {
      value: result,
      retained: false,
      itemNumber: rootItemNumber,
    };
    const pullTargets = [...ancestorTargets, currentTarget];
    let matched = false;
    let retained = false;
    const directEqualityClauses = directClauses?.filter((clause) => clause.type === "equality") ?? [];
    const globalEqualityClauses = globalClauses.filter((clause) => clause.type === "equality");
    const objectEntries = Object.entries(current);

    function conditionMatches(
      [key, child]: [string, JsonValue],
      clause: CompiledClause,
    ): boolean {
      return (
        matchesNamePattern(key, clause.pattern) &&
        (child === null || typeof child !== "object") &&
        String(child) === clause.expectedValue
      );
    }

    const hasDirectConditionMatch = directEqualityClauses.some((clause) =>
      objectEntries.some((entry) => conditionMatches(entry, clause)),
    );
    if (directEqualityClauses.length > 0 && !hasDirectConditionMatch) {
      return { matched: false, retained: false, value: result };
    }

    const hasApplicableGlobalCondition = globalEqualityClauses.some((clause) =>
      objectEntries.some(([key]) => matchesNamePattern(key, clause.pattern)),
    );
    const hasGlobalConditionMatch = globalEqualityClauses.some((clause) =>
      objectEntries.some((entry) => conditionMatches(entry, clause)),
    );
    if (hasApplicableGlobalCondition && !hasGlobalConditionMatch) {
      return { matched: false, retained: false, value: result };
    }

    const activeEqualityClauses =
      directEqualityClauses.length > 0 ? directEqualityClauses : globalEqualityClauses;
    const preserveUnselectedProperties =
      directEqualityClauses.length > 0
        ? directClauses?.every((clause) => clause.type === "equality")
        : hasApplicableGlobalCondition && globalClauses.every((clause) => clause.type === "equality");

    if (preserveUnselectedProperties) {
      for (const [key, child] of objectEntries) {
        if (
          !activeEqualityClauses.some((clause) => matchesNamePattern(key, clause.pattern))
        ) {
          result[key] = child;
          retained = true;
        }
      }
      return { matched: true, retained: true, value: result };
    }

    matched = hasDirectConditionMatch || hasGlobalConditionMatch;

    for (const [key, child] of objectEntries) {
      const matchingGlobalClauses = globalClauses.filter((clause) =>
        matchesNamePattern(key, clause.pattern),
      );
      const matchingDirectClauses =
        directClauses?.filter((clause) => matchesNamePattern(key, clause.pattern)) ?? [];
      const matchingClauses = [...matchingGlobalClauses, ...matchingDirectClauses];

      const pullClauses = matchingClauses.filter((clause) => clause.type === "pull");
      for (const clause of pullClauses) {
        const destinationName = clause.destinationName ?? key;
        const targetIndex =
          clause.pullDepth === "root"
            ? 0
            : Math.max(0, pullTargets.length - 1 - (clause.pullDepth ?? 0));
        const pullTarget = pullTargets[targetIndex];
        if (assignFirst(pullTarget, destinationName, child)) {
          pullTarget.retained = true;
        }
        matched = true;
      }

      if (matchingClauses.some((clause) => clause.type === "plain")) {
        if (assignFirst(currentTarget, key, child)) retained = true;
        matched = true;
        continue;
      }

      const childClauses = matchingClauses.flatMap((clause) => clause.children ?? []);
      const recursiveClauses = matchingDirectClauses.filter((clause) => clause.recursive);
      const nextDirectClauses = [...childClauses, ...recursiveClauses];
      const filtered = visit(
        child,
        nextDirectClauses.length > 0 ? nextDirectClauses : undefined,
        pullTargets,
        rootItemNumber,
      );
      if (filtered.matched) {
        matched = true;
      }
      if (filtered.retained) {
        if (assignFirst(currentTarget, key, filtered.value)) retained = true;
      }
    }

    return {
      matched,
      retained: retained || currentTarget.retained,
      value: result,
    };
  }

  if (clauses.length === 0) return { matched: true, value };
  if (Array.isArray(value)) {
    const result: JsonValue[] = [];

    for (const [index, item] of value.entries()) {
      const filtered: VisitResult = isObject(item)
        ? visit(item, rootClauses.length > 0 ? rootClauses : undefined, [], index + 1)
        : Array.isArray(item) && globalClauses.length > 0
          ? visit(item, undefined, [], index + 1)
          : { matched: false, retained: false, value: null };

      if (filtered.retained) result.push(filtered.value);
    }

    return {
      matched: result.length > 0,
      value: result,
      ...(errors.length > 0 ? { errors } : {}),
      ...(overwriteErrors.length > 0 ? { overwriteErrors } : {}),
    };
  }
  const filtered = visit(value, rootClauses.length > 0 ? rootClauses : undefined);
  return {
    matched: filtered.matched,
    value: filtered.value,
    ...(errors.length > 0 ? { errors } : {}),
    ...(overwriteErrors.length > 0 ? { overwriteErrors } : {}),
  };
}
