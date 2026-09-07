// Deliberately vulnerable test fixture: never use this pattern in production.
export function UnsafeMarkup({ html }) {
  return <section dangerouslySetInnerHTML={{ __html: html }} />;
}
