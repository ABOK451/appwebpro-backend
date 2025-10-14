const moment = require("moment"); // npm install moment

function formatDate(date) {
  if (!date) return null;
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
}

module.exports = { formatDate };