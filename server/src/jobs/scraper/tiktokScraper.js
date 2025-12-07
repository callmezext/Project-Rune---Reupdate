const axios = require("axios");
const cheerio = require("cheerio");
const { GLOBAL_HEADERS, TIKTOK } = require("../scraper/scrape");
const AppError = require("../../utils/AppError");

const getBioSignature = async (username) => {
  const url = `${TIKTOK.BASE_URL}/@${username}`;
  try {
    const { data } = await axios.get(url, { headers: GLOBAL_HEADERS });
    const $ = cheerio.load(data);
    const scriptContent = $("script#__UNIVERSAL_DATA_FOR_REHYDRATION__").html();

    if (!scriptContent) throw new AppError("Gagal parsing JSON TikTok (Structure Changed)", 500);

    const jsonData = JSON.parse(scriptContent);
    
    const signature = jsonData?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo?.user?.signature;
    const nickname = jsonData?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo?.user?.nickname;

    return { nickname, signature };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new AppError(`User @${username} tidak ditemukan.`, 404);
    }
    throw error;
  }
};

module.exports = { getBioSignature };