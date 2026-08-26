// Narrow DOM typing used by BuildDocumentationReport. Runtime code still guards for a missing preview element.
interface Document {
  querySelector<E extends Element = Element>(selectors: '.buildDocPreview'): E;
}
