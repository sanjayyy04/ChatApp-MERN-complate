const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const roundedRectPath = (width, height, cornerRadius) => {
  const cr = Math.min(cornerRadius, width / 2, height / 2);
  return (
    `M ${cr} 0 ` +
    `L ${width - cr} 0 ` +
    `Q ${width} 0 ${width} ${cr} ` +
    `L ${width} ${height - cr} ` +
    `Q ${width} ${height} ${width - cr} ${height} ` +
    `L ${cr} ${height} ` +
    `Q 0 ${height} 0 ${height - cr} ` +
    `L 0 ${cr} ` +
    `Q 0 0 ${cr} 0 Z`
  );
};

/**
 * Rounded vertical rail with an outward liquid bump on the right at notchY.
 */
export const buildLiquidRailClipPath = (width, height, notchY, options = {}) => {
  const cornerRadius = options.cornerRadius ?? 24;
  const notchRadius = options.notchRadius ?? 30;
  const bulge = options.bulge ?? 24;

  if (width <= 0 || height <= 0) {
    return roundedRectPath(Math.max(width, 1), Math.max(height, 1), cornerRadius);
  }

  if (notchY == null || Number.isNaN(notchY)) {
    return roundedRectPath(width, height, cornerRadius);
  }

  const cr = Math.min(cornerRadius, width / 2, height / 2);
  const r = Math.min(notchRadius, height / 2 - cr - 6);
  const y = clamp(notchY, cr + r + 2, height - cr - r - 2);
  const tipX = width + bulge;
  const neck = width + bulge * 0.35;

  return (
    `M ${cr} 0 ` +
    `L ${width - cr} 0 ` +
    `Q ${width} 0 ${width} ${cr} ` +
    `L ${width} ${y - r} ` +
    `C ${width} ${y - r * 0.42} ${neck} ${y - r * 0.92} ${tipX} ${y} ` +
    `C ${neck} ${y + r * 0.92} ${width} ${y + r * 0.42} ${width} ${y + r} ` +
    `L ${width} ${height - cr} ` +
    `Q ${width} ${height} ${width - cr} ${height} ` +
    `L ${cr} ${height} ` +
    `Q 0 ${height} 0 ${height - cr} ` +
    `L 0 ${cr} ` +
    `Q 0 0 ${cr} 0 Z`
  );
};

export const clipPathFromRailShape = (width, height, notchY, options) => {
  const path = buildLiquidRailClipPath(width, height, notchY, options);
  return `path('${path}')`;
};
