function uint8(value) {
  return value & 0xFF;
}

function int8(value) {
  return (value & 0xFF) << 24 >> 24;
}

function uint16(value) {
  return value & 0xFFFF;
}

function int16(value) {
  return (value & 0xFFFF) << 16 >> 16;
}

function uint32(value) {
  return value >>> 0;
}

function int32(value) {
  return value | 0;
}

