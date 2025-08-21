// path: /utils/image.ts (ou laisse ici)
type CropPixels = { width: number; height: number; x: number; y: number }

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropPixels,
  rotation = 0
): Promise<{ file: File; dataUrl: string }> {
  const image = await createImage(imageSrc)
  const rot = ((rotation % 360) + 360) % 360
  const radians = (rot * Math.PI) / 180

  // 1) Canvas "rotated" = boîte englobante après rotation
  const { width: boxW, height: boxH } = rotateBoundingBox(image.width, image.height, radians)
  const rCanvas = document.createElement('canvas')
  rCanvas.width = boxW
  rCanvas.height = boxH
  const rCtx = rCanvas.getContext('2d')
  if (!rCtx) throw new Error('Canvas 2D context not available')

  // Optionnel : améliore la qualité
  rCtx.imageSmoothingEnabled = true
  rCtx.imageSmoothingQuality = 'high'

  // Centre → rotate → draw image centrée
  rCtx.translate(boxW / 2, boxH / 2)
  rCtx.rotate(radians)
  rCtx.drawImage(image, -image.width / 2, -image.height / 2)
  rCtx.setTransform(1, 0, 0, 1, 0, 0) // reset

  // 2) Canvas "output" = exactement la taille du crop
  const out = document.createElement('canvas')
  out.width = pixelCrop.width
  out.height = pixelCrop.height
  const oCtx = out.getContext('2d')
  if (!oCtx) throw new Error('Canvas 2D context not available (out)')

  oCtx.imageSmoothingEnabled = true
  oCtx.imageSmoothingQuality = 'high'

  // ⚠️ Ici la magie : on "découpe" depuis le canvas pivoté
  //    (sx, sy, sw, sh) -> (0,0, w, h)
  oCtx.drawImage(
    rCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  const blob: Blob = await new Promise(resolve =>
    out.toBlob(b => resolve(b as Blob), 'image/png', 1)
  )
  const file = new File([blob], 'plan-transforme.png', { type: 'image/png' })
  const dataUrl = out.toDataURL('image/png')

  return { file, dataUrl }
}

function rotateBoundingBox(width: number, height: number, radians: number) {
  const w = Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height)
  const h = Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height)
  return { width: Math.round(w), height: Math.round(h) }
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}
