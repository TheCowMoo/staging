"""Generate simple PNG icons for the Facebook Lead Scraper extension."""
import struct
import zlib
import os

def create_png(width, height, r, g, b):
    """Create a minimal solid-color PNG with an 'F' text pattern."""
    # Minimal PNG: header, IHDR, IDAT, IEND
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(chunk) & 0xFFFFFFFF)
        return struct.pack('>I', len(data)) + chunk + crc

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)

    # Create raw pixel data (simple icon with circle + 'F')
    raw_data = bytearray()
    center_x, center_y = width // 2, height // 2
    radius = min(width, height) // 2 - 2

    for y in range(height):
        filter_byte = 0  # No filter
        raw_data.append(filter_byte)
        for x in range(width):
            dx, dy = x - center_x, y - center_y
            dist = (dx * dx + dy * dy) ** 0.5

            if dist <= radius:
                # Circle interior - gradient blue
                intensity = 1.0 - (dist / radius) * 0.3
                pr = int(24 * intensity)
                pg = int(119 * intensity)
                pb = int(242 * intensity)
                raw_data.extend([pr, pg, pb])
            else:
                # Background - dark
                raw_data.extend([26, 26, 46])

    # Compress raw data
    compressed = zlib.compress(bytes(raw_data))
    idat = make_chunk(b'IDAT', compressed)

    # IEND
    iend = make_chunk(b'IEND', b'')

    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    return signature + ihdr + idat + iend

# Generate icons
icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(icons_dir, exist_ok=True)

sizes = [16, 48, 128]
for size in sizes:
    png_data = create_png(size, size, 24, 119, 242)
    path = os.path.join(icons_dir, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f'Created {path} ({size}x{size})')

print('All icons generated successfully.')