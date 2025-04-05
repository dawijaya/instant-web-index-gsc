import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.send('GSC Integration Tool is running');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.get('/auth/google', (req, res) => {
  res.send('Redirecting to Google OAuth2...');
});
