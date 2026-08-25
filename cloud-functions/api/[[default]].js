import { edgeOneHandler } from '../_adapter.js';

export async function onRequest(context) {
  return edgeOneHandler(context);
}
