// Deliberate packaged test entry, also imported by native tests in a Chrome ISOLATED world.
// Not a production adapter export, content script or page-to-extension message bridge.
export { createFixtureReader } from '../adapters/read-only/fictional-reader';
export { compareObservation } from '../adapters/read-only/contract';
