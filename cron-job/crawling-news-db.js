import * as puppeteer from "puppeteer";
import ProgressBar from "progress";
import connectDB from "../database/db.js";
import News from "../schemas/news-schema.js";
import { formatDate } from "../utils/formatDate.js";

const stock_list = [
  { 애플: "AAPL.O" },
  { APPLE: "AAPL.O" },
  { APPL: "AAPL.O" },
  { 마이크로소프트: "MSFT.O" },
  { MS: "MSFT.O" },
  { MSFT: "MSFT.O" },
  { 구글: "GOOGL.O" },
  { GOOGLE: "GOOGL.O" },
  { GOOGL: "GOOGL.O" },
  { 알파벳: "GOOGL.O" },
  { 아마존: "AMZN.O" },
  { AMZN: "AMZN.O" },
  { 테슬라: "TSLA.O" },
  { TSLA: "TSLA.O" },
  { 유니티: "U" },
  { "NYS:U": "U" },
];

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const scrollPage = async (page) => {
  await page.evaluate(async () => {
    const distance = 100;
    const delay = 100;
    while (document.scrollingElement.scrollTop + window.innerHeight < document.scrollingElement.scrollHeight) {
      document.scrollingElement.scrollBy(0, distance);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  });
};

const getTranslatedContent = async (link, language, query) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080 });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.resourceType() === "image" || req.resourceType() === "stylesheet" || req.resourceType() === "font") {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto(link, { waitUntil: "networkidle2" });

  await page.waitForSelector(language.buttonSelector, { visible: true });
  await page.click(language.buttonSelector);
  await delay(3000);
  await scrollPage(page);

  const tags = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("#section-list > ul > li"))
      .slice(0, 10)
      .map((t) => ({
        title: t.querySelector(".titles a")?.textContent.trim(),
        thumbnail_url: t.querySelector("a > img")?.src,
        description: t.querySelector(".lead a")?.textContent.trim(),
        link: t.querySelector(".titles a")
          ? `https://news.einfomax.co.kr${t.querySelector(".titles a").getAttribute("href")}`
          : null,
        published_time: t.querySelector(".byline em:last-child")?.textContent,
      }));
  });

  const result = [];
  const extractStockSymbols = (text) => {
    const stocks = new Set();
    stock_list.forEach((stock) => {
      const [key, value] = Object.entries(stock)[0];
      if (text.includes(key)) {
        stocks.add(value);
      }
    });
    return Array.from(stocks);
  };

  for (const t of tags) {
    if (t.thumbnail_url && t.description && t.link) {
      await page.goto(t.link, { waitUntil: "networkidle2" });

      const articleContent = await page.evaluate(() => {
        const content = Array.from(document.querySelectorAll("#article-view-content-div p"))
          .map((p) => p.textContent.trim())
          .filter((text) => text.length > 0)
          .join("\n");

        const contentImg = document.querySelector("#article-view-content-div img")?.src || "";

        return { content, contentImg };
      });

      const { content, contentImg } = articleContent;

      let relative_stock = [];
      if (language.lang === "ko") {
        relative_stock = extractStockSymbols(t.title + " " + content);
      }
      const indexMatch = t.link.match(/idxno=(\d+)/);
      const index = indexMatch ? indexMatch[1] : null;

      result.push({
        index,
        publisher: {
          [language.lang]: language.publisher,
        },
        thumbnail_url: t.thumbnail_url,
        title: {
          [language.lang]: t.title,
        },
        description: {
          [language.lang]: t.description,
        },
        published_time: t.published_time,
        link: t.link,
        content: {
          [language.lang]: content,
        },
        content_img: contentImg,
        relative_stock,
        score: relative_stock.length,
      });
    }
  }

  await browser.close();
  return { lang: language.lang, data: result };
};

const getSearchNews = async (query) => {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const todayFormatted = formatDate(today);
  const yearStartFormatted = formatDate(yearStart);

  // sc_section_code=S1N21 (해외주식) 빈 값이면 전체
  // sc_area=A (검색영역 A: 전체, T: 제목+부제목, B: 본문)
  // sc_order_by=E
  // view_type=sm
  const url = `https://news.einfomax.co.kr/news/articleList.html?page=1&sc_section_code=&sc_area=A&sc_level=&sc_article_type=&sc_sdate=${yearStartFormatted}&sc_edate=${todayFormatted}&sc_serial_number=&sc_word=${encodeURI(
    query
  )}&box_idxno=&sc_order_by=E&view_type=sm`;

  const languages = [
    { lang: "ko", buttonSelector: ".translate-btn.kr", publisher: "연합 인포맥스" },
    { lang: "en", buttonSelector: ".translate-btn.en", publisher: "Yonhap Infomax" },
    { lang: "jp", buttonSelector: ".translate-btn.jp", publisher: "連合インフォマックス" },
    { lang: "ch", buttonSelector: ".translate-btn.cn", publisher: "韩联社 Infomax" },
  ];

  const translatedContentPromises = languages.map((language) => getTranslatedContent(url, language, query));

  const fetchWithRetry = async (promise, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const result = await promise;
      if (result.status === "fulfilled") {
        return result;
      }
    }
    return { status: "rejected", reason: "Retries exhausted" };
  };

  const translatedContents = await Promise.allSettled(translatedContentPromises);

  // 재시도 로직 추가
  const retriedContents = await Promise.all(
    translatedContents.map((result) => {
      if (result.status === "rejected") {
        const retryPromise = fetchWithRetry(result, 3);
        return retryPromise;
      }
      return result;
    })
  );

  console.log(retriedContents);

  const mergedResults = retriedContents.reduce((acc, curr) => {
    if (curr.status === "fulfilled") {
      curr.value.data.forEach((item) => {
        const existingItem = acc.find((i) => i.index === item.index);
        if (existingItem) {
          existingItem.publisher = { ...existingItem.publisher, ...item.publisher };
          existingItem.title = { ...existingItem.title, ...item.title };
          existingItem.description = { ...existingItem.description, ...item.description };
          existingItem.content = { ...existingItem.content, ...item.content };
        } else {
          acc.push(item);
        }
      });
    } else {
      console.error(`Failed to fetch data: ${curr.reason}`);
    }
    return acc;
  }, []);

  return mergedResults;
};

const addNewsToDatabase = async (newsDataList) => {
  await connectDB();

  try {
    for (const newsItem of newsDataList) {
      await News.updateOne(
        { index: newsItem.index }, // 조건: index가 같은지 확인
        {
          $set: {
            index: newsItem.index,
            publisher: newsItem.publisher,
            thumbnail_url: newsItem.thumbnail_url,
            title: newsItem.title,
            description: newsItem.description,
            published_time: newsItem.published_time,
            link: newsItem.link,
            content: newsItem.content,
            content_img: newsItem.content_img,
            relative_stock: newsItem.relative_stock,
            score: newsItem.score,
          },
        },
        { upsert: true } // 문서가 존재하지 않으면 삽입
      );
    }

    console.log("News data successfully added to the database.");
  } catch (error) {
    console.error("Error adding news data to the database:", error);
  }
};

const main = async () => {
  const queries = ["애플", "마이크로소프트", "아마존", "테슬라", "유니티", "구글"];
  const allResults = [];

  const bar = new ProgressBar(":bar :current/:total (:percent) :etas", { total: queries.length });

  for (const query of queries) {
    const result = await getSearchNews(query);
    allResults.push(...result);
    bar.tick(); // Progress bar update
    await delay(3000);
  }

  // 데이터베이스에 추가
  await addNewsToDatabase(allResults);
};

export { main };
