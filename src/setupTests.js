// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
// jest-extended is optional; disabled to avoid TS peer conflicts

// MSW setup (optional per-test activation)
// You can create src/test/server.js to define handlers if needed.

// Polyfill TextEncoder/Decoder for libraries that expect them in Node test env
import { TextEncoder, TextDecoder } from 'util';
// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;
// Polyfill ReadableStream for undici in JSDOM
try {
  // eslint-disable-next-line no-undef
  if (typeof ReadableStream === 'undefined') {
    // Node 16/18: use native WHATWG streams via node:stream/web
    const { ReadableStream: RS } = require('stream/web');
    // @ts-ignore
    global.ReadableStream = RS;
  }
} catch (e) {
  // Ignore; tests that don't hit fetch/streams will still pass
}
