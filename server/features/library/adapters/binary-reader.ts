export class Reader {
  offset = 0;
  constructor(readonly data: Buffer) {}
  need(n: number) {
    if (n < 0 || this.offset + n > this.data.length)
      throw new Error("Base tronquée ou format non pris en charge.");
  }
  skip(n: number) {
    this.need(n);
    this.offset += n;
  }
  byte() {
    this.need(1);
    return this.data[this.offset++];
  }
  short() {
    this.need(2);
    const v = this.data.readUInt16LE(this.offset);
    this.offset += 2;
    return v;
  }
  int() {
    this.need(4);
    const v = this.data.readInt32LE(this.offset);
    this.offset += 4;
    return v;
  }
  long() {
    this.need(8);
    const v = this.data.readBigInt64LE(this.offset);
    this.offset += 8;
    return v;
  }
  float() {
    this.need(4);
    const v = this.data.readFloatLE(this.offset);
    this.offset += 4;
    return v;
  }
  double() {
    this.need(8);
    const v = this.data.readDoubleLE(this.offset);
    this.offset += 8;
    return v;
  }
  count(limit = 2_000_000) {
    const n = this.int();
    if (n < 0 || n > limit) throw new Error("Nombre d’entrées invalide.");
    return n;
  }
  string() {
    const marker = this.byte();
    if (marker === 0) return "";
    if (marker !== 0x0b) throw new Error("Marqueur de chaîne invalide.");
    let n = 0,
      shift = 0,
      b: number;
    do {
      b = this.byte();
      n += (b & 0x7f) * 2 ** shift;
      shift += 7;
      if (shift > 35) throw new Error("Chaîne trop longue.");
    } while (b & 0x80);
    if (n > 16_000_000) throw new Error("Chaîne trop longue.");
    this.need(n);
    const result = this.data.toString("utf8", this.offset, this.offset + n);
    this.offset += n;
    return result;
  }
}
export function ticksDate(ticks: bigint) {
  if (ticks <= 621355968000000000n) return null;
  const ms = Number((ticks - 621355968000000000n) / 10000n);
  return Number.isFinite(ms) && ms < 8.64e15 ? new Date(ms).toISOString() : null;
}
