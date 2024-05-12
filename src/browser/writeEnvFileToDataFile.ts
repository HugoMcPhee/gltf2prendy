import path from "path";
import { EnvFileData } from "..";
import fs from "fs/promises";

export async function writeEnvFileDataToFile(envDataItem: EnvFileData, folderPath: string) {
  const envFilePath = path.join(folderPath, envDataItem.name);
  const envData = envDataItem.data;
  if (typeof envData === "string") {
    const nodeFile = Buffer.from(envData, "binary");
    await fs.writeFile(envFilePath, nodeFile, "binary");
  }
}
