export async function getBlobAsBinaryString(theBlob: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise(async (resolve, reject) => {
    const reader = new FileReader();
    reader.readAsBinaryString(theBlob);
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject("Error occurred while reading binary string");
  });
  // var blob = new Blob([arrayBuffer], { type: "octet/stream" });
  // const binaryFileResult = await getBlobAsBinaryString(blob);
}
