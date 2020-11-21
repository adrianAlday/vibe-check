import {
  fetchToken,
  fetchDeviceData,
  devicePaths,
  baseRequest,
  phoneRequest,
} from "../../common/helpers";
import axios from "axios";
import twilio from "twilio";

export const fetchInfo = async () => {
  const token = await fetchToken;

  const uniqueDevices = (await fetchDeviceData(token)).filter(
    (device) => device.subDeviceNo === 1
  );

  const deviceRequests = (dataType) =>
    uniqueDevices.map((device) => {
      const { uuid } = device;

      return axios
        .post(
          `https://smartapi.vesync.com/${
            devicePaths[device.deviceType]
          }/v1/device/${dataType}`,
          {
            ...baseRequest,
            ...phoneRequest,
            ...token,
            uuid,
          }
        )
        .then((response) => ({ ...response.data, uuid }));
    });

  const energyHistoryData = await Promise.all(deviceRequests("energymonth"));

  const [hours, minutes] = new Date()
    .toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour12: false,
    })
    .split(" ")[1]
    .slice(0, -3)
    .split(":");
  const percentOfDayElapsed = hours / 24 + minutes / 24 / 60;

  const findMatchingEntry = (originalEntry, arrayOfEntries) =>
    arrayOfEntries.find((entry) => entry.uuid === originalEntry.uuid);

  const message = uniqueDevices
    .map((device) => ({
      ...findMatchingEntry(device, energyHistoryData),
      ...device,
    }))
    .map((device) => {
      const { data, energyConsumptionOfToday, deviceName } = device;
      const trimmedData = data.slice(1, -1);
      const average =
        trimmedData.reduce((a, b) => a + b, 0) / trimmedData.length;
      const expected = average * percentOfDayElapsed;
      const today = energyConsumptionOfToday;
      const hoursBehindExpected = ((expected - today) / (average / 24)).toFixed(
        1
      );

      return {
        deviceName,
        hoursBehindExpected,
      };
    })
    .filter((device) => device.hoursBehindExpected >= -99)
    .sort((a, b) => (a.deviceName > b.deviceName ? 1 : -1))
    .map(
      (device) =>
        `${device.deviceName} ${device.hoursBehindExpected} hours behind`
    )
    .join(", ");

  if (message) {
    return await new twilio(
      process.env.TWILIO_ID,
      process.env.TWILIO_KEY
    ).messages
      .create({
        from: process.env.TWILIO_NUMBER,
        to: process.env.CHECKER_RECIPIENT,
        body: message,
      })
      .then((response) => response.body);
  } else {
    return "all good";
  }
};

const handler = async (req, res) => {
  !req.query.auth
    ? res.status(401).end()
    : req.query.auth !== process.env.CHECKER_KEY
    ? res.status(403).end()
    : res.json(await fetchInfo());
};

export default handler;
