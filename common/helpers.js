import axios from "axios";
import MD5 from "md5.js";

export const baseRequest = {
  acceptLanguage: "en",
  timeZone: "America/New_York",
};

const emptyString = "";

export const phoneRequest = {
  phoneBrand: emptyString,
  phoneOS: emptyString,
  appVersion: emptyString,
  traceId: emptyString,
};

export const fetchToken = axios
  .post("https://smartapi.vesync.com/cloud/v1/user/login", {
    ...baseRequest,
    ...phoneRequest,
    method: "login",
    email: process.env.EMAIL,
    password: new MD5().update(process.env.PASSWORD).digest("hex"),
  })
  .then((response) => {
    const { accountID, token } = response.data.result;

    return {
      accountID,
      token,
    };
  });

export const fetchDeviceData = (token) =>
  axios
    .post("https://smartapi.vesync.com/cloud/v1/deviceManaged/devices", {
      ...baseRequest,
      ...phoneRequest,
      ...token,
      method: "devices",
    })
    .then((response) => response.data.result.list);

export const devicePaths = {
  "ESO15-TB": "outdoorsocket15a",
  "ESW15-USA": "15a",
};
