import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { CronJob } from "cron";
import puppeteer from "puppeteer";
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

let browser;

const executeTask = async () => {
  console.log("===================================================");
  try {
    browser = await puppeteer.launch();
    const result = await main(browser); // 언어 전달 없이 실행
    console.log(result);
  } catch (error) {
    console.error("Error executing task:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const job = new CronJob("0 0,6,12,18 * * *", executeTask, null, true, "Asia/Seoul");

job.start();

// 프로세스 종료 시 브라우저를 강제로 닫음
const handleExit = async () => {
  if (browser) {
    await browser.close();
    console.log("Browser closed on process exit.");
  }
  process.exit();
};

process.on("exit", handleExit);
process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
process.on("uncaughtException", handleExit);

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send(`크롤링 서버가 ${PORT} 포트에서 실행 중입니다.`);
});

app.listen(PORT, () => {
  console.log(`크롤링 서버가 ${PORT} 포트에서 실행 중입니다.`);
});
