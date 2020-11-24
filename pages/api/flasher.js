import {
  fetchDetailedData,
  devicePaths,
  baseRequest,
  messageOnError,
} from "../../common/helpers";
import axios from "axios";

const DEVICE_STATUS = {
  ON: "on",
  OFF: "off",
};

export const flashDeviceStatus = async (req) => {
  let { deviceName, flashCount } = req.body;
  deviceName = deviceName || process.env.FLASHER_NAME;
  flashCount = flashCount || process.env.FLASHER_COUNT;

  const { devices, token, timeString } = await fetchDetailedData(
    (device) => device.deviceName === deviceName
  );

  const { deviceType, uuid, deviceStatus } = devices[0];

  const patchDeviceStatus = (status) =>
    axios.put(
      `https://smartapi.vesync.com/${devicePaths[deviceType]}/v1/device/devicestatus`,
      {
        ...baseRequest,
        ...token,
        uuid,
        status,
      }
    );

  const flashDeviceOneCycle = async () => {
    await patchDeviceStatus(
      deviceStatus === DEVICE_STATUS.ON ? DEVICE_STATUS.OFF : DEVICE_STATUS.ON
    );
    await patchDeviceStatus(deviceStatus);
  };

  for (let step = 0; step < flashCount; step++) {
    await flashDeviceOneCycle();
  }

  return { deviceName, flashCount, timeString };
};

const handler = async (req, res) => {
  !req.query.auth
    ? res.status(401).end()
    : req.query.auth !== process.env.FLASHER_KEY
    ? res.status(403).end()
    : res.json(await messageOnError(flashDeviceStatus(req), "flasher"));
};

export default handler;
