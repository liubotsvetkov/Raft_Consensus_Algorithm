const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.post("/", (req, res) => {
    res.send('Got a POST request');
});

app.put('/:key', (req, res) => {
    res.send('Got a PUT request for key');
});

app.delete('/:key', (req, res) => {
    res.send('Got a DELETE request for key');
});

module.exports = app;