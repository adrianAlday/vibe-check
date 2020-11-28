import {
  messageOnError,
  fetchDetailedData,
  chunk,
  airtableTable,
} from "../../common/helpers";

export const cleanDeviceLogs = async () => {
  const { timeString, devices } = await fetchDetailedData(
    (device) => device.subDeviceNo === 1
  );

  await Promise.all(
    devices.map(async (device) => {
      const { deviceName } = device;

      const deviceRecords = await airtableTable
        .select({
          fields: ["id"],
          filterByFormula: `deviceName="${deviceName}"`,
          sort: [{ field: "time", direction: "desc" }],
        })
        .all()
        .then((response) => response);

      await Promise.all(
        chunk(
          deviceRecords
            .splice(500)
            .reverse()
            .map((record) => record.id),
          10
        ).map(async (chunk) => {
          await airtableTable.destroy(chunk);
        })
      );

      return {};
    })
  );

  const message = "all good";
  return { message, timeString };
};

const handler = async (req, res) => {
  !req.query.auth
    ? res.status(401).end()
    : req.query.auth !== process.env.CLEANER_KEY
    ? res.status(403).end()
    : res.json(await messageOnError(cleanDeviceLogs(), "cleaner"));
};

export default handler;
