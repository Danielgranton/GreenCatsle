import crypto from "crypto";
import fs from "fs";
import path from "path";

const storageProvider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();

const randomKey = (prefix, originalName = "file") => {
  const ext = path.extname(originalName || "") || "";
  const name = crypto.randomBytes(16).toString("hex");
  return `${prefix}/${Date.now()}-${name}${ext}`;
};

const requireEnv = (name) => {
  const v = process.env[name];
  if (!v) {
    const err = new Error(`${name} is not set`);
    err.code = "MISSING_ENV";
    err.env = name;
    throw err;
  }
  return v;
};

const ensureUploadsDir = () => {
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
};

const writeLocal = async ({ buffer, key }) => {
  const uploadsDir = ensureUploadsDir();
  // Keep local keys flat so they remain compatible with the existing `/images` static mount.
  const filename = key.replaceAll("/", "__");
  const fullPath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(fullPath, buffer);
  return { filename, fullPath };
};

const deleteLocal = async ({ key }) => {
  const uploadsDir = ensureUploadsDir();
  const filename = key.replaceAll("/", "__");
  const fullPath = path.join(uploadsDir, filename);
  try {
    await fs.promises.unlink(fullPath);
  } catch (e) {
    if (e && e.code === "ENOENT") return;
    throw e;
  }
};

const getLocalUrl = ({ key }) => {
  const filename = key.replaceAll("/", "__");
  return `/images/${filename}`;
};

const getS3Client = async () => {
  // Lazy import so local dev works without AWS deps installed.
  const { S3Client } = await import("@aws-sdk/client-s3");
  const region = requireEnv("AWS_REGION");
  return new S3Client({ region });
};

export const putObject = async ({ buffer, contentType, key }) => {
  const provider = storageProvider;

  if (provider === "s3") {
    const bucket = requireEnv("S3_BUCKET_NAME");
    const client = await getS3Client();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || "application/octet-stream",
        ACL: "private",
      })
    );

    return { provider: "s3", key };
  }

  await writeLocal({ buffer, key });
  return { provider: "local", key };
};

export const deleteObject = async ({ key }) => {
  const provider = storageProvider;

  if (provider === "s3") {
    const bucket = requireEnv("S3_BUCKET_NAME");
    const client = await getS3Client();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }

  await deleteLocal({ key });
};

export const getSignedGetUrl = async ({ key, expiresInSeconds = 300 }) => {
  const provider = storageProvider;

  if (provider === "s3") {
    const bucket = requireEnv("S3_BUCKET_NAME");
    const client = await getS3Client();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    );
  }

  return getLocalUrl({ key });
};

export const makeObjectKey = ({ folder, originalName }) => {
  const safeFolder = (folder || "misc").replaceAll("..", "").replaceAll("\\", "/");
  return randomKey(safeFolder, originalName);
};

