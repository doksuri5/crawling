import mongoose from "mongoose";

const StockSchema = new mongoose.Schema({
  reuters_code: { type: String, required: true, unique: true },
  symbol_code: { type: String, required: true },
  stock_name: { type: String, required: true },
  stock_name_eng: { type: String, required: true },
  close_price: { type: Number, required: true },
  nation_type: { type: String, required: true },
  compare_to_previous_close_price: { type: Number, required: true },
  fluctuations_ratio: { type: Number, required: true },
  market_price: { type: Number, default: 0 },
  investment_index: { type: Number, default: 0 },
  profitability: { type: Number, default: 0 },
  growth_rate: { type: Number, default: 0 },
  interest_rate: { type: Number, default: 0 },
});

const Stock = mongoose.models.Stock || mongoose.model("Stock", StockSchema);
export default Stock;
