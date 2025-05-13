// ez-tag/src/runtime-checks/imageCheck.ts
export function runImageCheck(props: {
  src?: string;
  width?: number;
  height?: number;
}) {
  const { src, width, height } = props;

  if (!src || !width || !height) return;

  const img = new Image();
  img.src = src;

  img.onload = () => {
    const isOversized = img.naturalWidth > width || img.naturalHeight > height;
    const isUndersized = img.naturalWidth < width || img.naturalHeight < height;

    if (isOversized) {
      console.warn(
        `[EzTag] ⚠️ Image "${src}" is larger than expected dimensions (${width}x${height})`
      );
    }

    if (isUndersized) {
      console.warn(
        `[EzTag] ⚠️ Image "${src}" is smaller than expected dimensions (${width}x${height})`
      );
    }
  };
}
