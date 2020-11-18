import {
  fetchToken,
  fetchDeviceData,
  devicePaths,
  baseRequest,
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

  const token = await fetchToken;

  const device = (await fetchDeviceData(token)).find(
    (device) => device.deviceName === deviceName
  );

  const { deviceType, uuid, deviceStatus } = device;

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

  return { deviceName, flashCount, timestamp: Date.now() };
};

const handler = async (req, res) => {
  !req.query.auth
    ? res.status(401).end()
    : req.query.auth !== process.env.FLASHER_KEY
    ? res.status(403).end()
    : res.json(await flashDeviceStatus(req));
};

export default handler;
