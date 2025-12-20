
// Auto-generated stub for pino-pretty (no-op transport)
import { Writable } from "node:stream";
export default function pinoPretty() {
  return new Writable({
    write(_chunk, _enc, cb) {
      cb();
    }
  });
}
export function prettifier() {
  return (line) => line;
}
