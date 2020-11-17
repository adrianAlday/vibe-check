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
  const { deviceName, flashCount } = req.body;

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
};

const handler = async (req, res) => {
  if (!req.query.auth) {
    res.status(401).end();
  }

  if (req.query.auth !== process.env.FLASHER_KEY) {
    res.status(403).end();
  }

  flashDeviceStatus(req);
  res.status(200).end();
};

export default handler;
