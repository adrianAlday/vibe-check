import axios from "axios";
import MD5 from "md5.js";

export const fetchData = async () => {
  const emptyString = "";

  const baseRequest = {
    acceptLanguage: "en",
    timeZone: "America/New_York",
    phoneBrand: emptyString,
    phoneOS: emptyString,
    appVersion: emptyString,
    traceId: emptyString,
  };

  const loginData = await axios
    .post("https://smartapi.vesync.com/cloud/v1/user/login", {
      ...baseRequest,
      method: "login",
      email: process.env.EMAIL,
      password: new MD5().update(process.env.PASSWORD).digest("hex"),
    })
    .then((response) => response.data);

  const { accountID, token } = loginData.result;

  const authenticatedRequest = {
    accountID,
    token,
  };

  const deviceData = await axios
    .post("https://smartapi.vesync.com/cloud/v1/deviceManaged/devices", {
      ...baseRequest,
      ...authenticatedRequest,
      method: "devices",
    })
    .then((response) => response.data);

  const uniqueDevices = deviceData.result.list.filter(
    (device) => device.deviceType === "ESO15-TB" && device.subDeviceNo === 1
  );

  const deviceRequests = (path) =>
    uniqueDevices.map((device) => {
      const { uuid } = device;

      return axios
        .post(
          `https://smartapi.vesync.com/outdoorsocket15a/v1/device/${path}`,
          {
            ...baseRequest,
            ...authenticatedRequest,
            uuid: uuid,
          }
        )
        .then((response) => ({ ...response.data, uuid }));
    });

  const deviceDetailData = await Promise.all(deviceRequests("devicedetail"));

  const energyHistoryData = await Promise.all(deviceRequests("energymonth"));

  const findMatchingEntry = (originalEntry, arrayOfEntries) =>
    arrayOfEntries.find((entry) => entry.uuid === originalEntry.uuid);

  const devices = uniqueDevices.map((device) => ({
    ...findMatchingEntry(device, energyHistoryData),
    ...findMatchingEntry(device, deviceDetailData),
    ...device,
  }));

  return { devices };
};

const handler = async (req, res) => {
  res.json(await fetchData());
};

export default handler;
