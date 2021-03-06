import {
  fetchDetailedData,
  sendMessage,
  messageOnError,
} from "../../common/helpers";

export const fetchDevicePace = async (req) => {
  const { devices, timeString } = await fetchDetailedData(
    (device) => device.subDeviceNo === 1,
    ["energyweek"]
  );

  const [hours, minutes] = timeString.split(" ")[1].slice(0, -3).split(":");
  const percentOfDayElapsed = hours / 24 + minutes / 24 / 60;

  const requestedMessage = devices
    .map((device) => {
      const { data, energyConsumptionOfToday, deviceName } = device;
      data.pop();
      const average = data.reduce((a, b) => a + b, 0) / data.length;
      const hoursBehindExpected = (
        (average * percentOfDayElapsed - energyConsumptionOfToday) /
        (average / 24)
      ).toFixed(1);

      return {
        deviceName,
        hoursBehindExpected,
      };
    })
    .filter(
      (device) => req.query.force === "true" || device.hoursBehindExpected >= 2
    )
    .sort((a, b) => (a.deviceName > b.deviceName ? 1 : -1))
    .map(
      (device) =>
        `${device.deviceName} ${Math.abs(device.hoursBehindExpected)} hours ${
          device.hoursBehindExpected >= 0 ? "behind" : "ahead"
        }`
    )
    .join(", ");

  const message = requestedMessage
    ? await sendMessage(requestedMessage)
    : "all good";

  return { message, timeString };
};

const handler = async (req, res) => {
  !req.query.auth
    ? res.status(401).end()
    : req.query.auth !== process.env.CHECKER_KEY
    ? res.status(403).end()
    : res.json(await messageOnError(fetchDevicePace(req), "checker"));
};

export default handler;
