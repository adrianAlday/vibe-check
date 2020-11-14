import axios from "axios";
import MD5 from "md5.js";
import Head from "next/head";

const fetchData = async () => {
  const emptyString = "";

  const baseRequest = {
    acceptLanguage: "en",
    timeZone: "America/New_York",
    phoneBrand: emptyString,
    phoneOS: emptyString,
    appVersion: emptyString,
    traceId: emptyString,
  };

  const loginData = await axios
    .post("https://smartapi.vesync.com/cloud/v1/user/login", {
      ...baseRequest,
      method: "login",
      email: process.env.EMAIL,
      password: new MD5().update(process.env.PASSWORD).digest("hex"),
    })
    .then((response) => response.data);

  const { accountID, token } = loginData.result;

  const authenticatedRequest = {
    accountID,
    token,
  };

  const deviceData = await axios
    .post("https://smartapi.vesync.com/cloud/v1/deviceManaged/devices", {
      ...baseRequest,
      ...authenticatedRequest,
      method: "devices",
    })
    .then((response) => response.data);

  const uniqueDevices = deviceData.result.list.filter(
    (device) => device.subDeviceNo === 1
  );

  const deviceRequests = (path) =>
    uniqueDevices.map((device) => {
      const { uuid } = device;

      return axios
        .post(
          `https://smartapi.vesync.com/outdoorsocket15a/v1/device/${path}`,
          {
            ...baseRequest,
            ...authenticatedRequest,
            uuid: uuid,
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

  return {
    devices,
  };
};

export const getStaticProps = async () => {
  const data = await fetchData();

  return {
    props: data,
    revalidate: 60 * 5,
  };
};

const Home = ({ devices }) => {
  const title = "vibe check 🌵⚡🌷";

  const deviceIcon = (device) => {
    switch (device.deviceName) {
      case "Agave":
      case "Saguaro":
        return "🌵";
      case "Orchid":
      case "Kalea Lilly":
        return "🌷";
      default:
        return emptyString;
    }
  };

  const daysToShow = 8;

  const dayLabel = (index, days) => {
    const daysAgo = days.length - 1 - index;

    switch (daysAgo) {
      case 0:
        return "today";
      case 1:
        return "yesterday";
      default:
        return `${daysAgo} days ago`;
    }
  };

  return (
    <div className="container">
      <Head>
        <title>{title}</title>

        <link rel="icon" href="/favicon.ico" />

        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=IBM+Plex+Sans"
        />
      </Head>

      <div className="section">{title}</div>

      {devices
        .sort((a, b) => (a.deviceName > b.deviceName ? 1 : -1))
        .map((device) => (
          <div className="section" key={device.uuid}>
            <div className="section">
              {deviceIcon(device)} {device.deviceName.toLowerCase()}
            </div>

            <div className="grid section">
              <div>getting power:</div>

              <div>{device.connectionStatus === "online" ? "⚡" : "❌"}</div>

              <div>sending power:</div>

              <div>{device.deviceStatus === "on" ? "⚡" : "❌"} </div>
            </div>

            <div>
              <div className="section">energy drawn:</div>
              <div className="grid">
                {device.data
                  .slice(-1 * daysToShow)
                  .map((energy, index, array) => (
                    <React.Fragment key={`${device.uuid}-${index}`}>
                      <div>{dayLabel(index, array)}:</div>

                      <div className="bar">
                        {"🌵 ".repeat(Math.ceil(energy))}
                      </div>
                    </React.Fragment>
                  ))}
              </div>
            </div>
          </div>
        ))}
      <style jsx global>{`
        :root {
          --bar-font-size: 5px;
        }
        body {
          font-family: "IBM Plex Sans", serif;
          background-color: #202124;
          color: #d8dbdd;
          max-width: 700px;
          margin: auto;
          padding: 8px;
        }
        .section {
          margin-bottom: 16px;
        }
        .grid {
          display: grid;
          grid-template-columns: 120px auto;
          align-items: center;
        }
        .bar {
          font-size: var(--bar-font-size);
        }

        @media screen and (min-width: 700px) {
          :root {
            --bar-font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
