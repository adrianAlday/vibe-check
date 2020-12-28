import {
  messageOnError,
  fetchDetailedData,
  airtableTable,
  sendMessage,
} from "../../common/helpers";
// import axios from "axios";

export const fetchDeviceUsage = async (sendText) => {
  const { time, timeString, devices } = await fetchDetailedData(
    (device) => device.subDeviceNo === 1,
    ["energyweek"]
  );

  const allDevicesLatestUsageData = await Promise.all(
    devices.map(async (device) => {
      const { deviceName, data } = device;

      const today = data.pop();
      const yesterday = data.pop();

      const lastRecord = await airtableTable
        .select({
          fields: ["time", "yesterday", "today"],
          filterByFormula: `deviceName="${deviceName}"`,
          sort: [{ field: "time", direction: "desc" }],
          maxRecords: 1,
        })
        .firstPage()
        .then((response) => response[0]?.fields);

      const lastTime = lastRecord?.time;
      const lastToday = lastRecord?.today;

      const energySinceLastRecord =
        today < lastToday ? yesterday - lastToday + today : today - lastToday;

      const timeSinceLastRecord = (time - lastTime) / 1000 / 60 / 60;

      const deviceLastestUsageData = {
        deviceName,
        time,
        timeString,
        yesterday,
        today,
        energySinceLastRecord,
        timeSinceLastRecord,
      };

      if (energySinceLastRecord > 0 || !lastTime) {
        await airtableTable.create([
          {
            fields: deviceLastestUsageData,
          },
        ]);
      }

      return {
        ...deviceLastestUsageData,
        lastTime,
      };
    })
  );

  const requestedMessage = allDevicesLatestUsageData
    .filter(
      (data) =>
        data.timeSinceLastRecord > 1.5 && data.energySinceLastRecord === 0
    )
    .sort((a, b) => (a.deviceName > b.deviceName ? 1 : -1))
    .map(
      (data) =>
        `${data.deviceName}: ${data.energySinceLastRecord.toFixed(
          2
        )}kWh used in the last ${data.timeSinceLastRecord.toFixed(1)} hours`
    )
    .join(", ");

  const message = requestedMessage
    ? sendText
      ? await sendMessage(requestedMessage)
      : requestedMessage
    : "all good";

  return { message, timeString };
};

const handler = async (req, res) => {
  !req.query.auth
    ? res.status(401).end()
    : req.query.auth !== process.env.LOGGER_KEY
    ? res.status(403).end()
    : res.json(
        await messageOnError(
          fetchDeviceUsage(req.query.text !== "false"),
          "logger"
        )
      );
};

export default handler;
