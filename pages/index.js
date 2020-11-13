import axios from "axios";
import CryptoJS from "crypto-js";
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
      password: CryptoJS.MD5(process.env.PASSWORD).toString(),
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

  const energyWeekData = await Promise.all(deviceRequests("energyweek"));

  const devices = uniqueDevices.map((device) => ({
    ...energyWeekData.find(
      (energyWeekData) => energyWeekData.uuid === device.uuid
    ),
    ...deviceDetailData.find(
      (deviceDetailData) => deviceDetailData.uuid === device.uuid
    ),
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
  };
};

const Home = ({ devices }) => {
  return (
    <div className="container">
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no"
        />

        <title>vibe check 🌵⚡🌷</title>

        <link rel="icon" href="/favicon.ico" />

        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=IBM+Plex+Sans"
        />
      </Head>

      <div className="section">vibe check 🌵⚡🌷</div>

      {devices
        .sort((a, b) => (a.deviceName > b.deviceName ? 1 : -1))
        .map((device) => (
          <div className="section">
            <div className="section">
              {["Agave", "Saguaro"].includes(device.deviceName) ? "🌵" : "🌷"}{" "}
              {device.deviceName.toLowerCase()}
            </div>

            <div className="grid section">
              <div>getting power:</div>

              <div>{device.connectionStatus === "online" ? "⚡" : "❌"}</div>

              <div>turned on:</div>

              <div>{device.deviceStatus === "on" ? "⚡" : "❌"} </div>
            </div>

            <div>
              <div className="section">energy drawn:</div>
              <div className="grid">
                {device.data.map((energy, index) => {
                  const daysAgo = device.data.length - 1 - index;
                  const label = () => {
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
                    <React.Fragment>
                      <div>{label()}:</div>

                      <div>{"🌵 ".repeat(Math.ceil(energy))}</div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      <style jsx global>{`
        body {
          font-family: "IBM Plex Sans", serif;
          background-color: #202124;
          color: #d8dbdd;
          width: 600px;
          margin: auto;
        }
        .section {
          margin-bottom: 16px;
        }
        .grid {
          display: grid;
          grid-template-columns: 150px auto;
        }
      `}</style>
    </div>
  );
};

export default Home;
