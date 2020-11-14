import { fetchData } from "./api/devices";
import { useState, useEffect } from "react";
import axios from "axios";
import Head from "next/head";

const minutesUntilStale = 5;

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

  const roundedNumber = (value, nearest) =>
  Math.ceil(value / nearest) * nearest;

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

      <div className="mb">updated {data.timestamp}</div>

      {data.devices
        .sort((a, b) => (a.deviceName > b.deviceName ? 1 : -1))
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
                    const energyRoundedTo1 = roundedNumber(energy, 1);

                    return (
                      <React.Fragment key={`${device.uuid}-${index}`}>
                        <div>{dayLabel(index, array)}:</div>

                        <div className="bar">
                          {"🌵 ".repeat(energyRoundedTo1)}{" "}
                          {reverseIndex(index, array) === 0
                            ? roundedNumber(energy, 0.01)
                            : energyRoundedTo1}
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
        .mb {
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

export default Dashboard;
