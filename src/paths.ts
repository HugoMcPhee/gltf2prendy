export function splitFilePath(fullPathOriginal: string) {
  const fullPath = fullPathOriginal.replaceAll("\\", "/");
  const lastSeparatorIndex = fullPath.lastIndexOf("/");
  const directoryPath = fullPath.slice(0, lastSeparatorIndex); // returns '/path/to'
  const lastDirectorySeparatorIndex = directoryPath.lastIndexOf("/");
  const parentFolderName = directoryPath.slice(lastDirectorySeparatorIndex + 1); // returns 'to'
  const filename = fullPath.slice(lastSeparatorIndex + 1); // returns 'file.txt'

  console.log("fullPath");
  console.log(fullPath);

  const lastDotIndex = filename.lastIndexOf(".");
  const filenameWithoutExtension = filename.slice(lastSeparatorIndex + 1, lastDotIndex); // returns 'file'
  const fileExtension = fullPath.slice(lastDotIndex + 1); // returns 'txt'

  return {
    filename,
    directoryPath,
    parentFolderName,
    name: filenameWithoutExtension,
    extension: fileExtension,
  };
}

export function splitFolderPath(fullPathOriginal: string) {
  const fullPath = fullPathOriginal.replaceAll("\\", "/");
  const lastSeparatorIndex = fullPath.lastIndexOf("/");
  const directoryPath = fullPath.slice(0, lastSeparatorIndex); // returns '/path/to'
  const lastDirectorySeparatorIndex = directoryPath.lastIndexOf("/");
  const parentFolderName = directoryPath.slice(lastDirectorySeparatorIndex + 1); // returns 'to'
  const foldername = fullPath.slice(lastSeparatorIndex + 1); // returns 'file.txt'

  return {
    foldername,
    directoryPath,
    parentFolderName,
  };
}
