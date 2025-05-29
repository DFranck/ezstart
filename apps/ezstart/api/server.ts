import { connectToDb } from './db/connect';
import app from './index';
console.log(require.resolve('@ezstart/types/schemas'));
const PORT = process.env.PORT || 5000;

connectToDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  });
