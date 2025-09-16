/**
 * Uses the browser's getDisplayMedia API to capture the current tab.
 * @returns A promise that resolves to a base64-encoded JPEG image string.
 */
export const captureTab = async (): Promise<string> => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      // @ts-ignore - 'browser' is a valid preferCurrentTab value for modern browsers
      preferCurrentTab: true,
    },
    audio: false,
  });

  const track = stream.getVideoTracks()[0];
  
  // A brief delay can help ensure the stream is fully initialized.
  await new Promise(resolve => setTimeout(resolve, 300));

  // ImageCapture is a modern API for grabbing frames from a video track.
  // @ts-ignore - ImageCapture is well-supported but might not be in all TS lib versions.
  const imageCapture = new ImageCapture(track);
  const bitmap = await imageCapture.grabFrame();

  // Stop the screen sharing track & UI indicator.
  track.stop();

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error("Could not create canvas context");
  }
  context.drawImage(bitmap, 0, 0);

  // Return the image as a data URL.
  return canvas.toDataURL('image/jpeg');
};
