import { fetchDetailedData } from "../../common/helpers";

export const fetchDeviceData = async () => {
  const { devices, time, timeString } = await fetchDetailedData(
    (device) => device.subDeviceNo !== 2,
    ["devicedetail", "energyweek"]
  );

  return { devices, time, timeString };
};

const handler = async (req, res) => {
  res.json(await fetchDeviceData());
};

export default handler;
