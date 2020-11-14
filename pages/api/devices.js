import axios from "axios";
import MD5 from "md5.js";
import { emptyString } from "../index";

export const fetchData = async () => {
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
    (device) => device.subDeviceNo !== 2
  );

  const devicePath = {
    "ESO15-TB": "outdoorsocket15a",
    "ESW15-USA": "15a",
  };

  const deviceRequests = (dataPath) =>
    uniqueDevices.map((device) => {
      const { uuid } = device;

      return axios
        .post(
          `https://smartapi.vesync.com/${
            devicePath[device.deviceType]
          }/v1/device/${dataPath}`,
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

  const timestamp = Date.now();

  return { devices, timestamp };
};

const handler = async (req, res) => {
  res.json(await fetchData());
};

export default handler;
