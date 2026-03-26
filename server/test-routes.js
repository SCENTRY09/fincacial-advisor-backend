const express = require('express');
const app = express();

app.get('/api/auth/google', (req, res) => {
  res.send('Google OAuth route is working!');
});

app.listen(5000, () => {
  console.log('Test server running on port 5000');
  console.log('Visit: http://localhost:5000/api/auth/google');
});
