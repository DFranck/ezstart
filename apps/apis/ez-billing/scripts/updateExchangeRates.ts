import 'dotenv/config';
import mongoose from 'mongoose';
import { updateAllExchangeRates } from '../cron/update-exchange-rates';

(async () => {
  await mongoose.connect(process.env.MONGO_URL!);
  await updateAllExchangeRates();
  await mongoose.disconnect();
  process.exit();
})();
