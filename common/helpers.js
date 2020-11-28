import axios from "axios";
import MD5 from "md5.js";
import twilio from "twilio";
import Airtable from "airtable";

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

export const sendMessage = async (message) =>
  await Promise.all(
    process.env.CHECKER_RECIPIENTS.split(",").map(
      async (recipient) =>
        await new twilio(process.env.TWILIO_ID, process.env.TWILIO_KEY).messages
          .create({
            from: process.env.TWILIO_NUMBER,
            to: recipient,
            body: message,
          })
          .then((response) => {
            const { to, body } = response;
            return { to, body };
          })
    )
  );

export const messageOnError = async (wrappedFunction, endpoint) =>
  await wrappedFunction.catch(async (error) => {
    await sendMessage(`${endpoint} error: ${error}`);
    return error;
  });

export const airtableTable = new Airtable({
  apiKey: process.env.AIRTABLE_KEY,
}).base(process.env.AIRTABLE_BASE)(process.env.AIRTABLE_TABLE);

export const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
