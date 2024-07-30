import mongoose from "mongoose";

const PopularSearchSchema = new mongoose.Schema({
  stock_name: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
});

const PopularSearch = mongoose.models.PopularSearch || mongoose.model("PopularSearch", PopularSearchSchema);
export default PopularSearch;
