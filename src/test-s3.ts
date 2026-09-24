import dotenv from "dotenv";

dotenv.config();

import s3 from "./config/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const testUpload = async () => {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: "test/test.txt",
            Body: "Hello from Of Wild & Walls!",
            ContentType: "text/plain",
        });

        const result = await s3.send(command);

        console.log("S3 upload successful!");
        console.log(result);
    } catch (error) {
        console.error("S3 upload failed:");
        console.error(error);
    }
};

testUpload();