import {
  fetchToken,
  fetchDeviceData,
  devicePaths,
  baseRequest,
  phoneRequest,
} from "../../common/helpers";
import axios from "axios";

export const fetchData = async () => {
  const token = await fetchToken;

  const uniqueDevices = (await fetchDeviceData(token)).filter(
    (device) => device.subDeviceNo !== 2
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

  const deviceDetailData = await Promise.all(deviceRequests("devicedetail"));

  const energyHistoryData = await Promise.all(deviceRequests("energymonth"));

  const findMatchingEntry = (originalEntry, arrayOfEntries) =>
    arrayOfEntries.find((entry) => entry.uuid === originalEntry.uuid);

  const devices = uniqueDevices.map((device) => ({
    ...findMatchingEntry(device, energyHistoryData),
    ...findMatchingEntry(device, deviceDetailData),
    ...device,
  }));

  return { devices, timestamp: Date.now() };
};

const handler = async (req, res) => {
  res.json(await fetchData());
};

export default handler;
