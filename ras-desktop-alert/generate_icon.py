"""Generate a Five Stones branded shield icon with navy/gold colors."""
import struct
import zlib

NAVY = (11, 31, 51)
GOLD = (201, 168, 106)
STEEL = (58, 95, 125)

def create_png(width, height):
    pixels = []
    for y in range(height):
        row = []
        for y_px in range(height):
            for x_px in range(width):
                cx = x_px / width
                cy = y_px / height
                
                # Shield shape
                left_edge = 0.15 + 0.35 * cy
                right_edge = 0.85 - 0.35 * cy
                top_curve = 0.12
                if cy < top_curve:
                    t = cy / top_curve
                    left_edge = 0.15 + 0.35 * t
                    right_edge = 0.85 - 0.35 * t
                
                in_shield = left_edge <= cx <= right_edge
                
                if in_shield:
                    # Gradient from navy to steel
                    r = int(11 + (58 - 11) * cy)
                    g = int(31 + (95 - 31) * cy)
                    b = int(51 + (125 - 51) * cy)
                    a = 255
                    
                    # Gold outline on edges
                    edge_dist = min(cx - left_edge, right_edge - cx)
                    if edge_dist < 0.06:
                        t = edge_dist / 0.06
                        r = int(GOLD[0] * (1 - t) + r * t)
                        g = int(GOLD[1] * (1 - t) + g * t)
                        b = int(GOLD[2] * (1 - t) + b * t)
                else:
                    r, g, b, a = 0, 0, 0, 0
                row.extend([r, g, b, a])
        pixels.append(bytes(row))
    
    raw_rows = b''
    for y in range(height):
        raw_rows += b'\x00' + pixels[y]
    
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xFFFFFFFF)
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = make_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = make_chunk(b'IDAT', zlib.compress(raw_rows))
    iend = make_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def create_ico(filepath):
    sizes = [16, 32, 48, 64, 128, 256]
    pngs = {s: create_png(s, s) for s in sizes}
    
    header = struct.pack('<HHH', 0, 1, len(sizes))
    offset = 6 + len(sizes) * 16
    entries = b''
    for size in sizes:
        png = pngs[size]
        w = 0 if size == 256 else size
        h = 0 if size == 256 else size
        entries += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(png), offset)
        offset += len(png)
    
    with open(filepath, 'wb') as f:
        f.write(header + entries)
        for size in sizes:
            f.write(pngs[size])
    print(f"Icon created: {filepath}")

if __name__ == '__main__':
    create_ico('app.ico')