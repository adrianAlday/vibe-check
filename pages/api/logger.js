import { fetchDetailedData, airtableTable } from "../../common/helpers"; // import { messageOnError, fetchDetailedData, airtableTable } from "../../common/helpers";

export const fetchDeviceUsage = async () => {
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
      const lastYesterday = lastRecord?.yesterday;

      const energySinceLastRecord =
        today < lastToday
          ? yesterday - lastYesterday + today
          : today - lastToday;

      const deviceLastestUsageData = {
        deviceName,
        time,
        timeString,
        yesterday,
        today,
        energySinceLastRecord,
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
    .filter((data) => data.energySinceLastRecord < 1)
    .sort((a, b) => (a.deviceName > b.deviceName ? 1 : -1))
    .map(
      (data) =>
        `${data.deviceName}: ${data.energySinceLastRecord.toFixed(
          2
        )}kWh used in the last ${(
          (data.time - data.lastTime) /
          1000 /
          60
        ).toFixed(0)} minutes`
    )
    .join(", ");

  const message = requestedMessage
    ? requestedMessage // await sendMessage(requestedMessage)
    : "all good";

  return { message, timeString };
};

const handler = async (req, res) => {
  !req.query.auth
    ? res.status(401).end()
    : req.query.auth !== process.env.LOGGER_KEY
    ? res.status(403).end()
    : res.json(await fetchDeviceUsage()); //  res.json(await messageOnError(fetchDeviceUsage(), "logger"));
};

export default handler;
