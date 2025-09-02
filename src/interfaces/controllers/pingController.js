const { ping } = require("../../application/pingService");

function getPing(req, res) {
  res.status(200).send(ping());
}

module.exports = { getPing };
