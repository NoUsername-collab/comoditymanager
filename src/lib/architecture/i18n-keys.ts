import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Finds translation keys used in code that are missing from messages/{ro,en,bg}.json.
 *
 * Follows `const t = useTranslations("ns")` / `await getTranslations("ns")` (also inside
 * `await Promise.all([...])` and with `{ namespace }`) per scope, then checks every
 * literal `t("key")`, `t.rich("key")`, `t.raw("key")` and `t.markup("key")`.
 * Dynamic keys (`t(\`x.${id}\`)`) are out of scope.
 */

type MissingKey = { file: string; locale: string; key: string };

const LOCALES = ["ro", "en", "bg"] as const;
const TRANSLATOR_FACTORIES = new Set(["useTranslations", "getTranslations"]);
const TRANSLATOR_METHODS = new Set(["rich", "raw", "markup"]);

function root(): string {
  return path.resolve(__dirname, "../../..");
}

function loadMessages(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const locale of LOCALES) {
    out[locale] = JSON.parse(
      fs.readFileSync(path.join(root(), "messages", `${locale}.json`), "utf8"),
    );
  }
  return out;
}

function lookup(messages: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object") return (node as Record<string, unknown>)[part];
    return undefined;
  }, messages);
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      sourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Namespace of `useTranslations("ns")` / `getTranslations({ namespace: "ns" })`, if any. */
function factoryNamespace(node: ts.Expression | undefined): string | null | undefined {
  let expr = node;
  if (expr && ts.isAwaitExpression(expr)) expr = expr.expression;
  if (!expr || !ts.isCallExpression(expr)) return undefined;
  if (!ts.isIdentifier(expr.expression) || !TRANSLATOR_FACTORIES.has(expr.expression.text)) {
    return undefined;
  }
  const arg = expr.arguments[0];
  if (!arg) return null;
  if (ts.isStringLiteralLike(arg)) return arg.text;
  if (ts.isObjectLiteralExpression(arg)) {
    for (const prop of arg.properties) {
      if (
        ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === "namespace" &&
        ts.isStringLiteralLike(prop.initializer)
      ) {
        return prop.initializer.text;
      }
    }
    return null;
  }
  return undefined;
}

function auditFile(file: string, messages: Record<string, unknown>): MissingKey[] {
  const text = fs.readFileSync(file, "utf8");
  if (!/(use|get)Translations/.test(text)) return [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  // name → namespace (null = root); false = a non-translator shadows an outer one.
  const scopes: Map<string, string | null | false>[] = [new Map()];
  const found: MissingKey[] = [];
  const rel = path.relative(root(), file).replaceAll("\\", "/");

  const resolve = (name: string): string | null | undefined => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const value = scopes[i]!.get(name);
      if (value === false) return undefined;
      if (value !== undefined) return value;
    }
    return undefined;
  };

  const bind = (decl: ts.VariableDeclaration) => {
    const scope = scopes[scopes.length - 1]!;
    if (ts.isIdentifier(decl.name)) {
      const ns = factoryNamespace(decl.initializer);
      scope.set(decl.name.text, ns === undefined ? false : ns);
      return;
    }
    // const [t, x] = await Promise.all([getTranslations("a"), ...])
    if (ts.isArrayBindingPattern(decl.name) && decl.initializer) {
      let init: ts.Expression = decl.initializer;
      if (ts.isAwaitExpression(init)) init = init.expression;
      if (
        ts.isCallExpression(init) &&
        init.arguments[0] &&
        ts.isArrayLiteralExpression(init.arguments[0])
      ) {
        const items = init.arguments[0].elements;
        decl.name.elements.forEach((element, index) => {
          if (!ts.isBindingElement(element) || !ts.isIdentifier(element.name)) return;
          const ns = factoryNamespace(items[index]);
          if (ns !== undefined) scope.set(element.name.text, ns);
        });
      }
    }
  };

  const check = (ns: string | null, key: string) => {
    const full = ns ? `${ns}.${key}` : key;
    for (const locale of LOCALES) {
      if (typeof lookup(messages[locale], full) !== "string") {
        found.push({ file: rel, locale, key: full });
      }
    }
  };

  const visit = (node: ts.Node) => {
    const opensScope =
      ts.isBlock(node) || ts.isSourceFile(node) || ts.isFunctionLike(node) || ts.isModuleBlock(node);
    if (opensScope && !ts.isSourceFile(node)) scopes.push(new Map());

    if (ts.isVariableDeclaration(node)) bind(node);

    if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      let callee: ts.Expression = node.expression;
      if (
        ts.isPropertyAccessExpression(callee) &&
        TRANSLATOR_METHODS.has(callee.name.text)
      ) {
        callee = callee.expression;
      }
      if (ts.isIdentifier(callee)) {
        const ns = resolve(callee.text);
        if (ns !== undefined) check(ns, node.arguments[0].text);
      }
    }

    ts.forEachChild(node, visit);
    if (opensScope && !ts.isSourceFile(node)) scopes.pop();
  };

  visit(source);
  return found;
}

export function auditMissingTranslationKeys(): MissingKey[] {
  const messages = loadMessages();
  return sourceFiles(path.join(root(), "src")).flatMap((file) => auditFile(file, messages));
}
