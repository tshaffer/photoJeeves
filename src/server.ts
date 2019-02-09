// import express from 'express';
// const app = express();

// app.get('/', (req, res) => res.send('Hello World!'));

// app.listen(8088, () => console.log('Example app listening on port 8088!'));

import app from './app';
const PORT = 8088;

app.listen(PORT, () => {
    console.log('Express server listening on port ' + PORT);
});
