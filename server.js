import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { CronJob } from "cron";

import connectDB from "./database/db.js";
import { main } from "./cron-job/crawling-news-db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.join(__dirname, "./.env.production") });
} else if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.join(__dirname, "./.env.development") });
}

const app = express();

app.use(express.json());

// DB 연결
connectDB();

// 작업 정의
const executeTask = async () => {
  console.log("===================================================");
  console.log(await main());
};

const job = new CronJob(
  "0 0,6,12,18 * * *",
  executeTask,
  null, // onComplete 콜백은 필요 없으므로 null로 설정
  true, // true일 경우 서버가 재시작 되면 자동으로 다시 실행
  "Asia/Seoul"
);

job.start();

// 서버 시작 시 즉시 실행
(async () => {
  await executeTask();
})();

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send(`크롤링 서버가 ${PORT} 포트에서 실행 중입니다.`);
});

// 서버 연결
app.listen(PORT, () => {
  console.log("크롤링 서버 연결");
});
