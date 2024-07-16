import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { CronJob } from "cron";

import connectDB from "./database/db.js";
import { main } from "./cron-job/search-news-db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.join(__dirname, "./.env.production") });
} else if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.join(__dirname, "./.env.development") });
}

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// DB 연결
connectDB();

// 작업 정의
const executeTask = async () => {
  console.log("===================================================");
  console.log(await main());
};

await executeTask();

// (async () => {
//   await executeTask();

//   const job = new CronJob(
//     "*/1 * * * *",
//     executeTask,
//     () => {
//       console.log("작업이 완료되었습니다.");
//     },
//     true, // true일 경우 서버가 재시작 되면 자동으로 다시 실행
//     "Asia/Seoul"
//   );

//   job.start();
// })();

// 서버 연결
app.listen(5000, () => {
  console.log("크롤링 서버 연결");
});
