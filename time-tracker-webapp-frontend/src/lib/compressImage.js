// Shrink a camera photo before upload: longest side ≤ 1600px, JPEG.
// A ~4 MB phone photo becomes ~300 KB, so uploads are fast on site data.
const MAX_SIDE = 1600;
const QUALITY = 0.8;

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that photo')); };
  img.src = url;
});

export const compressImage = async (file) => {
  // createImageBitmap respects EXIF orientation where supported
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await loadImage(file);
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(source, 0, 0, width, height);
  source.close?.();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('Could not process that photo');
  return blob;
};
