// Deliberately vulnerable test fixture: never use this pattern in production.
export function compileExpression(source: string): Function {
  return new Function(source);
}
