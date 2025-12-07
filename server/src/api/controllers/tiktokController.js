const tiktokService = require("../../services/tiktokService");
const { success } = require("../../utils/response");

const checkProfile = async (req, res, next) => {
  try {
    const { username } = req.query;

    if (!username) {
      throw new Error("Parameter 'username' wajib diisi!");
    }

    const data = await tiktokService.getProfileData(username);
    return success(res, 200, "Berhasil mengambil data profile", data);
  } catch (err) {
    next(err);
  }
};

module.exports = { checkProfile };
