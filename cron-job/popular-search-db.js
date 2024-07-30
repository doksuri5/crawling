import connectDB from "../database/db.js";
import PopularSearch from "../schemas/popularSearch-schema.js";
import SchedulePopularSearch from "../schemas/schedulePopularSearch-schema.js";
import { getKoreanTime } from "../utils/getKoreanTime.js";

export const schedulePopularSearchJob = async () => {
  try {
    console.log("검색어 저장 시작");
    await connectDB();

    // PopularSearch 데이터 가져오기
    const popularSearches = await PopularSearch.find();

    // SchedulePopularSearch 업데이트
    for (const search of popularSearches) {
      await SchedulePopularSearch.findOneAndUpdate(
        { stock_name: search.stock_name },
        { count: search.count, updated_at: getKoreanTime() },
        { upsert: true }
      );
    }
    console.log("SchedulePopularSearch updated successfully.");
  } catch (error) {
    console.error("Error updating SchedulePopularSearch:", error);
  }
};
