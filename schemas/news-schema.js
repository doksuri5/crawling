import mongoose from "mongoose";

const NewsSchema = new mongoose.Schema({
  index: { type: String, required: true },
  publisher: {
    ko: { type: String, required: true },
    en: { type: String, required: true },
    ch: { type: String, required: true },
    jp: { type: String, required: true },
    // fr: { type: String, required: true },
  },
  thumbnail_url: { type: String, required: true },
  title: {
    ko: { type: String, required: true },
    en: { type: String, required: true },
    ch: { type: String, required: true },
    jp: { type: String, required: true },
    // fr: { type: String, required: true },
  },
  description: {
    ko: { type: String, required: true },
    en: { type: String, required: true },
    ch: { type: String, required: true },
    jp: { type: String, required: true },
    // fr: { type: String, required: true },
  },
  published_time: { type: String, required: true },
  link: { type: String, required: true },
  content: {
    ko: { type: String, required: true },
    en: { type: String, required: true },
    ch: { type: String, required: true },
    jp: { type: String, required: true },
    // fr: { type: String, required: true },
  },
  content_img: { type: String, required: true },
  relative_stock: { type: [String] },
  score: { type: Number, default: 0 },
  view: { type: Number, default: 0 },
  ai_summary: {
    ko: { type: String },
    en: { type: String },
    ch: { type: String },
    jp: { type: String },
    // fr: { type: String },
  },
});

const News = mongoose.models.News || mongoose.model("News", NewsSchema);
export default News;
