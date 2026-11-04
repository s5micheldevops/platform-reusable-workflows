// Deliberately vulnerable test fixture: never use this pattern in production.
export function executeInput(input) {
  return eval(input);
}
