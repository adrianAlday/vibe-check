import { fetchDetailedData } from "../../common/helpers";

export const fetchData = async () => {
  const { devices, time, timeString } = await fetchDetailedData(
    (device) => device.subDeviceNo !== 2,
    ["devicedetail", "energymonth"]
  );

  return { devices, time, timeString };
};

const handler = async (req, res) => {
  res.json(await fetchData());
};

export default handler;
