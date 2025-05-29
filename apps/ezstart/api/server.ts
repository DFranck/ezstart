import app from './index';
console.log(require.resolve('@ezstart/types/schemas'));
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
