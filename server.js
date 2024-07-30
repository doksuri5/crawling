import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { CronJob } from "cron";

import connectDB from "./database/db.js";
import { main } from "./cron-job/crawling-news-db.js";
import { schedulePopularSearchJob } from "./cron-job/popular-search-db.js";

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

// 크롤링 스케쥴
const crawlingJob = new CronJob(
  "0 0,12 * * *",
  async () => {
    console.log("===================================================");
    console.log(await main());
  },
  null,
  true,
  "Asia/Seoul"
);
crawlingJob.start();

// 인기 검색어 스케쥴
const popularSearchJob = new CronJob("59 * * * *", schedulePopularSearchJob, null, true, "Asia/Seoul");
popularSearchJob.start();

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send(`<div>
    <p>크롤링 서버가 ${PORT} 포트에서 실행 중입니다.</p>
    <p>v1.2.0</p>
    </div>`);
});

// 서버 연결
app.listen(PORT, () => {
  console.log("크롤링 서버 연결");
});
