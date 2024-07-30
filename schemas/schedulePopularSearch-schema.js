import mongoose from "mongoose";
import { getKoreanTime } from "../utils/getKoreanTime.js";

const SchedulePopularSearchSchema = new mongoose.Schema({
  stock_name: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  updated_at: { type: Date, default: () => getKoreanTime() },
});

const SchedulePopularSearch =
  mongoose.models.SchedulePopularSearch || mongoose.model("SchedulePopularSearch", SchedulePopularSearchSchema);
export default SchedulePopularSearch;
