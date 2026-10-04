// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title CanvasRenderer
/// @notice Turns a Wall Street Place canvas into a 4-bit BMP wrapped in a pixel-crisp SVG,
///         entirely on-chain.
library CanvasRenderer {
    uint256 internal constant SIZE = 100;
    uint256 private constant ROW_BYTES = 52; // 50 bytes of 4-bit pixels + 2 bytes padding
    uint256 private constant HEADER_BYTES = 118; // 14 file + 40 DIB + 64 palette
    uint256 private constant BMP_BYTES = HEADER_BYTES + ROW_BYTES * SIZE;

    /// @dev 16-colour palette as BMP BGRA quads.
    ///      white, light grey, grey, near black, pink, red, orange, brown,
    ///      yellow, lime, green, cyan, blue, dark blue, violet, purple.
    bytes private constant PALETTE = hex"ffffff00e4e4e4008888880022222200d1a7ff000000e5000095e500426aa000"
        hex"00d9e50044e0940001be0200ddd30000c7830000ea000000e46ecf0080008200";

    function palette() internal pure returns (bytes memory) {
        return PALETTE;
    }

    /// @param canvas `SIZE * SIZE` bytes, each (team << 4) | color.
    function toBmp(bytes memory canvas) internal pure returns (bytes memory bmp) {
        bmp = new bytes(BMP_BYTES);
        // File header
        bmp[0] = "B";
        bmp[1] = "M";
        _u32(bmp, 2, BMP_BYTES);
        _u32(bmp, 10, HEADER_BYTES);
        // DIB header (BITMAPINFOHEADER)
        _u32(bmp, 14, 40);
        _u32(bmp, 18, SIZE);
        _u32(bmp, 22, SIZE); // positive height = bottom-up rows
        bmp[26] = 0x01; // planes
        bmp[28] = 0x04; // bits per pixel
        _u32(bmp, 34, ROW_BYTES * SIZE);
        _u32(bmp, 38, 2835);
        _u32(bmp, 42, 2835);
        _u32(bmp, 46, 16);

        bytes memory pal = PALETTE;
        for (uint256 i; i < 64; ++i) {
            bmp[54 + i] = pal[i];
        }

        for (uint256 row; row < SIZE; ++row) {
            uint256 y = SIZE - 1 - row;
            uint256 out = HEADER_BYTES + row * ROW_BYTES;
            uint256 src = y * SIZE;
            for (uint256 x; x < SIZE; x += 2) {
                uint8 hi = uint8(canvas[src + x]) & 0x0f;
                uint8 lo = uint8(canvas[src + x + 1]) & 0x0f;
                bmp[out + x / 2] = bytes1((hi << 4) | lo);
            }
        }
    }

    function toSvg(bytes memory canvas) internal pure returns (string memory) {
        return string.concat(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='800' height='800'>",
            "<image width='100' height='100' style='image-rendering:pixelated' href='data:image/bmp;base64,",
            Base64.encode(toBmp(canvas)),
            "'/></svg>"
        );
    }

    function _u32(bytes memory b, uint256 offset, uint256 value) private pure {
        b[offset] = bytes1(uint8(value));
        b[offset + 1] = bytes1(uint8(value >> 8));
        b[offset + 2] = bytes1(uint8(value >> 16));
        b[offset + 3] = bytes1(uint8(value >> 24));
    }
}
