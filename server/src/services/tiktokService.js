const tiktokScraper = require('../jobs/scraper/tiktokScraper');

const getProfileData = async (username) => {
  const data = await tiktokScraper.getBioSignature(username);
  return data;
};

module.exports = { getProfileData };