// Build a minimal valid .ico (single 48x48 PNG entry) — crawlers request
// /favicon.ico directly regardless of the <link rel="icon"> tag.
import { readFileSync, writeFileSync } from 'node:fs';

const png = readFileSync('public/favicon-48.png');

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // count

const entry = Buffer.alloc(16);
entry.writeUInt8(48, 0);            // width
entry.writeUInt8(48, 1);            // height
entry.writeUInt8(0, 2);             // palette
entry.writeUInt8(0, 3);             // reserved
entry.writeUInt16LE(1, 4);          // color planes
entry.writeUInt16LE(32, 6);         // bits per pixel
entry.writeUInt32LE(png.length, 8); // data size
entry.writeUInt32LE(22, 12);        // data offset (6 + 16)

writeFileSync('public/favicon.ico', Buffer.concat([header, entry, png]));
console.log('favicon.ico written:', 22 + png.length, 'bytes');
