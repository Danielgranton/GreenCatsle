import { getSignedGetUrl } from "./services/storageService.js";
process.env.STORAGE_PROVIDER = "s3";
process.env.AWS_REGION = "us-east-1";
process.env.S3_BUCKET_NAME = "my-bucket";
(async () => {
   try {
     const url = await getSignedGetUrl({ key: "test-folder/123-abc.png" });
     console.log("SIGNED URL IS:", url);
   } catch(e) {
     console.error("ERROR:", e);
   }
})();
