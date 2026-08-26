// Keep the report preview selector non-null after its runtime guard without narrowing other querySelector calls.
interface Document {
  querySelector<E extends Element = Element>(selectors: '.buildDocPreview'): E;
  querySelector<E extends Element = Element>(selectors: string): E | null;
}
