import axios from "axios";
import MD5 from "md5.js";

export const baseRequest = {
  acceptLanguage: "en",
  timeZone: "America/New_York",
};

const emptyString = "";

const phoneRequest = {
  phoneBrand: emptyString,
  phoneOS: emptyString,
  appVersion: emptyString,
  traceId: emptyString,
};

export const devicePaths = {
  "ESO15-TB": "outdoorsocket15a",
  "ESW15-USA": "15a",
};

export const fetchDetailedData = async (filterDevices, pathArray = []) => {
  const token = await axios
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

  const deviceArray = (
    await axios
      .post("https://smartapi.vesync.com/cloud/v1/deviceManaged/devices", {
        ...baseRequest,
        ...phoneRequest,
        ...token,
        method: "devices",
      })
      .then((response) => response.data.result.list)
  ).filter(filterDevices);

  const detailedDataArray = await Promise.all(
    pathArray.map(
      async (path) =>
        await Promise.all(
          deviceArray.map((device) => {
            const { uuid } = device;

            return axios
              .post(
                `https://smartapi.vesync.com/${
                  devicePaths[device.deviceType]
                }/v1/device/${path}`,
                {
                  ...baseRequest,
                  ...phoneRequest,
                  ...token,
                  uuid,
                }
              )
              .then((response) => ({ ...response.data, uuid }));
          })
        )
    )
  );

  const devices = deviceArray.map((device) =>
    detailedDataArray
      .map((detailedData) =>
        detailedData.find((entry) => entry.uuid === device.uuid)
      )
      .reduce(
        (accumulator, currentValue) => ({ ...currentValue, ...accumulator }),
        device
      )
  );

  const time = Date.now();

  const timeString = new Date(time).toLocaleString("en-CA", {
    timeZone: "America/New_York",
    hour12: false,
  });

  return { token, devices, time, timeString };
};
