import * as puppeteer from "puppeteer";
import { Translator } from "deepl-node";
import connectDB from "../database/db.js";
import News from "../schemas/news-schema.js";
import Stock from "../schemas/stock-schema.js";
import { formatDate } from "../utils/formatDate.js";
import { getKoreanTime } from "../utils/getKoreanTime.js";

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

const translateTextFn = async (text) => {
  if (!text) return "";
  const translator = new Translator(process.env.DEEPL_API_KEY, {
    timeout: 20000,
  });

  const result = await translator.translateText(text, null, "fr");
  return result.text;
};

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

const getTranslatedContent = async (link, language, existingIndexes) => {
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS === "true" ? true : false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    timeout: 60000,
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

  await page.goto(link, { waitUntil: "networkidle2", timeout: 60000 });

  await page.evaluate((language) => {
    document.cookie = language.lang !== "fr" ? `googtrans=/ko/${language.lang_cookie}` : `googtrans=/ko/en`;
  }, language);
  await page.reload({ waitUntil: "networkidle2" });
  await delay(3000);

  await scrollPage(page);

  const tags = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("#section-list > ul > li"))
      .slice(0, 5)
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
      await page.goto(t.link, { waitUntil: "networkidle2", timeout: 60000 });

      const articleContent = await page.evaluate(() => {
        const contentDiv = document.querySelector("#article-view-content-div");
        const paragraphs = Array.from(contentDiv.querySelectorAll("p")).map((p) => p.textContent.trim());

        const additionalText = Array.from(contentDiv.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent.trim())
          .filter((text) => text.length > 0);

        const content = [...paragraphs, ...additionalText].join("\n");
        const contentImg = contentDiv.querySelector("img")?.src || "";

        if (content.trim() === "(끝)") {
          return null;
        }

        if (contentImg === "") {
          return null;
        }

        return { content, contentImg };
      });

      if (articleContent) {
        const { content, contentImg } = articleContent;
        const indexMatch = t.link.match(/idxno=(\d+)/);
        const index = indexMatch ? indexMatch[1] : null;

        if (existingIndexes.includes(index)) {
          continue;
        }

        let relative_stock = [];
        if (language.lang === "ko") {
          relative_stock = extractStockSymbols(t.title + " " + content);
        }

        const translatedTitle = language.lang === "fr" ? await translateTextFn(t.title) : t.title;
        const translatedContent = language.lang === "fr" ? await translateTextFn(content) : content;
        const translatedDescription = language.lang === "fr" ? translatedContent.slice(0, 200) : t.description;

        result.push({
          index,
          publisher: {
            [language.lang]: language.publisher,
          },
          thumbnail_url: t.thumbnail_url,
          title: {
            [language.lang]: translatedTitle,
          },
          description: {
            [language.lang]: translatedDescription,
          },
          published_time: t.published_time,
          link: t.link,
          content: {
            [language.lang]: translatedContent,
          },
          content_img: contentImg,
          relative_stock,
          score: relative_stock.length,
        });
      }
    }
  }

  await browser.close();
  return { lang: language.lang, data: result };
};

const getSearchNews = async (query, existingIndexes) => {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const todayFormatted = formatDate(today);
  const yearStartFormatted = formatDate(yearStart);

  let url = "";
  if (query !== "유니티") {
    url = `https://news.einfomax.co.kr/news/articleList.html?page=1&sc_section_code=&sc_area=A&sc_level=&sc_article_type=&sc_sdate=${yearStartFormatted}&sc_edate=${todayFormatted}&sc_serial_number=&sc_word=${encodeURI(
      query
    )}&box_idxno=&sc_order_by=E&view_type=sm`;
  } else {
    url = `https://news.einfomax.co.kr/news/articleList.html?page=1&sc_section_code=&sc_sub_section_code=&sc_serial_code=&sc_area=A&sc_level=&sc_article_type=&sc_view_level=&sc_sdate=${yearStartFormatted}&sc_edate=${todayFormatted}&sc_serial_number=&sc_word=${encodeURI(
      query
    )}&box_idxno=&sc_multi_code=&sc_is_image=&sc_is_movie=&sc_user_name=&sc_order_by=E&view_type=sm`;
  }

  const languages = [
    { lang: "ko", lang_cookie: "ko", publisher: "연합 인포맥스" },
    { lang: "en", lang_cookie: "en", publisher: "Yonhap Infomax" },
    { lang: "jp", lang_cookie: "ja", publisher: "連合インフォマックス" },
    { lang: "ch", lang_cookie: "zh-CN", publisher: "韩联社 Infomax" },
    { lang: "fr", publisher: "Yonhap Infomax" },
  ];

  const allResults = [];

  for (const language of languages) {
    const translatedContent = await getTranslatedContent(url, language, existingIndexes);
    allResults.push(translatedContent);
    await delay(2000); // 언어 변경 후 딜레이
  }

  const mergedResults = allResults.reduce((acc, curr) => {
    curr.data.forEach((item) => {
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
    return acc;
  }, []);

  return mergedResults.filter((item) => !existingIndexes.includes(item.index));
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

function diffTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const main = async () => {
  await connectDB();
  const data = await Stock.find({}, { _id: 0, stock_name: 1 });
  const queries = data.map((stock) => {
    const value = stock.stock_name;
    return value === "알파벳 Class A" ? "구글" : value === "유니티소프트웨어" ? "유니티" : value;
  });

  console.log(`실행 시작 시간 : ${diffTime(getKoreanTime())}`);

  for (const query of queries) {
    console.log(query, diffTime(getKoreanTime()));
    const existingIndexes = await News.find({}, { index: 1 }).then((news) => news.map((n) => n.index));
    const result = await getSearchNews(query, existingIndexes);
    await addNewsToDatabase(result);
    await delay(3000);
  }

  console.log(`실행 종료 시간 : ${diffTime(getKoreanTime())}`);
};

export { main };
