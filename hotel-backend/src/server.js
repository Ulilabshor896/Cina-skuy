const { openDb } = require("./db");
const { createApp } = require("./app");

const port = process.env.PORT || 3000;
createApp(openDb()).listen(port, () => console.log(`Buka http://localhost:${port}`));
