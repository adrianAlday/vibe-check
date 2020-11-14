import { fetchData } from "./api/devices";
import { useState, useEffect } from "react";
import axios from "axios";
import Head from "next/head";

const minutesUntilStale = 5;

export const emptyString = "";

export const getStaticProps = async () => {
  const data = await fetchData();

  return {
    props: data,
    revalidate: minutesUntilStale * 60,
  };
};

const Dashboard = (props) => {
  const [data, setData] = useState(props);

  useEffect(() => {
    const refreshDevices = setInterval(async () => {
      setData(await axios.get("api/devices").then((response) => response.data));
    }, minutesUntilStale * 60 * 1000);
    return () => clearInterval(refreshDevices);
  }, []);

  const title = "vibe check 🌵⚡🌷";

  const deviceIcon = (device) => {
    switch (device.deviceName) {
      case "Agave":
      case "Saguaro":
        return "🌵";
      case "Orchid":
      case "Kale-a Lily":
        return "🌷";
      case "Cacti Lights":
        return "💡";
      case "Front Porch":
        return "🏡";
      default:
        return emptyString;
    }
  };

  const onIcon = (boolean) => (boolean ? "⚡" : "❌");

  const daysToShow = 8;

  const reverseIndex = (index, array) => array.length - 1 - index;

  const dayLabel = (index, array) => {
    const daysAgo = reverseIndex(index, array);

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

      <div className="mb">{title}</div>

      <div className="mb">
        updated{" "}
        {new Date(data.timestamp)
          .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
          .toLowerCase()
          .replace(" ", emptyString)
          .replace("m", emptyString)}
      </div>

      {data.devices
        .sort((a, b) => (a.deviceName < b.deviceName ? 1 : -1))
        .sort((a, b) => (a.deviceType > b.deviceType ? 1 : -1))
        .map((device) => (
          <div className="mb" key={device.uuid}>
            <div className="mb">
              {deviceIcon(device)} {device.deviceName.toLowerCase()}
            </div>

            <div className="grid mb">
              <div>getting power:</div>

              <div>{onIcon(device.connectionStatus === "online")}</div>

              <div>sending power:</div>

              <div>{onIcon(device.deviceStatus === "on")} </div>
            </div>

            <div>
              <div className="mb">energy drawn:</div>

              <div className="grid">
                {device.data
                  .slice(-1 * daysToShow)
                  .map((energy, index, array) => {
                    const energyRoundedTo1 = energy.toFixed(0);

                    return (
                      <React.Fragment key={`${device.uuid}-${index}`}>
                        <div>{dayLabel(index, array)}:</div>

                        <div className="flex">
                          <div className="bar">
                            {`${deviceIcon(device)} `.repeat(energyRoundedTo1)}
                          </div>

                          <div>
                            &nbsp;
                            {reverseIndex(index, array) === 0
                              ? energy.toFixed(2)
                              : energyRoundedTo1}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
              </div>
            </div>
          </div>
        ))}

      <style jsx global>{`
        :root {
          --bar-font-size: 4px;
        }
        body {
          font-family: "IBM Plex Sans", serif;
          background-color: #202124;
          color: #d8dbdd;
          max-width: 700px;
          margin: auto;
          padding: 8px;
        }
        .mb {
          margin-bottom: 16px;
        }
        .grid {
          display: grid;
          grid-template-columns: 120px auto;
          align-items: center;
        }
        .flex {
          display: flex;
          align-items: center;
        }
        .bar {
          font-size: var(--bar-font-size);
        }

        @media screen and (min-width: 700px) {
          :root {
            --bar-font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
