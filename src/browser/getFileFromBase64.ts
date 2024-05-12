export function getFileFromBase64(
  base64String: string,
  fileName: string
): File {
  const editedBase64 = base64String.replace("data:", "").replace(/^.+,/, "");

  const byteString = window.atob(editedBase64);
  const byteStringLength = byteString.length;
  const byteArray = new Uint8Array(byteStringLength);
  for (let i = 0; i < byteStringLength; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([byteArray], {
    type: "application/octet-stream",
  });
  return new File([blob], fileName, {
    type: "application/octet-stream",
  });
}
