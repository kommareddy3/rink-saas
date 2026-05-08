// Vercel serverless entry point.
// The actual Express app lives in server/server.js — this file just re-exports
// it so Vercel can deploy it as a Serverless Function (api/* convention).
module.exports = require("../server/server.js");
