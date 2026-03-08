import { useEffect, useMemo, useRef, useState } from "react";
import TrendPickup from "./trend_pickup";

type CurrencyItem = {
  pair: string;
  trend: number;
  touchLow: number;
  aveDiff: string;
  aoCaution: number;
  limitDiff05: number;
  limitDiff01: number;
  deg05: number;
  bolin05: number;
  bolin15: number;
  aoStatus: string;
  externalAlert: number;
};

type TrendData = {
  trendsound: string;
  pickup_world: string;
  pickup_local: string;
  currency: string[][];
};

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);

  const currentUrl = window.location.href;
  const defaultApiPath =
    currentUrl.indexOf("trend-pickupper9.sakura.ne.jp") > -1
      ? "./api/pickup_json_sa_v1.php"
      : "./api/pickup_json_v1.php";

  const runPickup = (pair: string, day: string) => {
    const root = rootRef.current;
    if (!root) return;

    const pairEl = root.querySelector("#pair") as HTMLSelectElement | null;
    const pickupDayEl = root.querySelector("#pickupDay") as HTMLInputElement | null;
    const dayPickupBtn = root.querySelector("#dayPickupBtn") as HTMLButtonElement | null;

    if (pairEl) pairEl.value = pair;
    if (pickupDayEl) pickupDayEl.value = day;
    dayPickupBtn?.click();
  };

  const [data, setData] = useState<TrendData | null>(null);
  const [error, setError] = useState<string | null>(null);

  //const [muteFlag, setMute] = useState<number>(0);
  const [cloak, setCloak] = useState<boolean>(true);
  const [keepSound, setKeepSound] = useState<boolean>(true);
  const [dateStr, setDateStr] = useState<string>("");
  const [colorTime, setColorTime] = useState<boolean>(false);

  const prevSig = useRef<number[]>([]);
  const didRun = useRef<boolean>(false);

  const [startSignalList, setStartSignalList] = useState<number[]>(
    Array(14).fill(0)
  );

  const [muteList, setMuteList] = useState<number[]>(
    Array(14).fill(0)
  );
/*
  const [signalFlag, setSignalList] = useState<number[]>(
    Array(14).fill(0)
  );
*/
  const [previousSignals, setPreviousSignals] = useState<string[][]>(
    Array.from({ length: 14 }, () => [])
  );

  const [previousSignalsDeg, setPreviousSignalsDeg] = useState<string[][]>(
    Array.from({ length: 14 }, () => [])
  );

  const denenRef = useRef<HTMLAudioElement | null>(null);
  const signalRef = useRef<HTMLAudioElement | null>(null);

  const denenPlay = () => {
    if (!denenRef.current) return;
    denenRef.current.volume = 0;
    void denenRef.current.play();
    setCloak(false);
  };

  const signalPlay = () => {
    if (!signalRef.current) return;
    signalRef.current.volume = 1;
    void signalRef.current.play();
  };

  const soundStop = () => {
    setKeepSound((prev) => !prev);
  };

  useEffect(() => {
    async function fetchData() {
      fetch(defaultApiPath)
        .then(async (res) => {
          const text = await res.text();
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
          }
          return JSON.parse(text) as TrendData;
        })
        .then(setData)
        .catch((e: unknown) => setError(String(e)));
    }

    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => clearInterval(interval);
  }, [defaultApiPath]);

  const items: CurrencyItem[] = useMemo(() => {
    return (
      data?.currency?.map((row) => ({
        pair: row[0] ?? "",
        trend: Number(row[1] ?? 0),
        touchLow: Number(row[2] ?? 0),
        aveDiff: row[3] ?? "",
        aoCaution: Number(row[4] ?? 0),
        limitDiff05: Number(row[5] ?? 0),
        limitDiff01: Number(row[6] ?? 0),
        deg05: Number(row[7] ?? 0),
        bolin05: Number(row[8] ?? 0),
        bolin15: Number(row[9] ?? 0),
        aoStatus: row[10] ?? "",
        externalAlert: Number(row[11] ?? 0),
      })) ?? []
    );
  }, [data]);

  useEffect(() => {
    prevSig.current = [...startSignalList];

    if (items.length === 0) return;

    setPreviousSignals((prev) =>
      prev.map((list, index) => {
        const next = [...list, String(items[index]?.trend ?? 0)];
        if (next.length > 240) next.shift();
        return next;
      })
    );

    setPreviousSignalsDeg((prev) =>
      prev.map((list, index) => {
        const next = [...list, String(items[index]?.bolin15 ?? 0)];
        if (next.length > 10) next.shift();
        return next;
      })
    );

    setStartSignalList(items.map((item) => item.trend));

    let nowSignal = false;

    prevSig.current.forEach((prevValue, index) => {
      const currentValue = items[index]?.trend ?? 0;

      if (
        currentValue === 3 ||
        currentValue === -3 ||
        currentValue === -4
      ) {
        if (prevValue < 3 || prevValue > -3) {
          if (currentValue !== prevValue) {
            nowSignal = true;
          }
        }
      }
    });

    if (nowSignal && keepSound) {
      signalPlay();
    }

    if (data) {
      const timeAll = new Date(data.pickup_world);
      const timeMin = timeAll.getMinutes();

      if ((timeMin >= 50 && timeMin <= 59) || (timeMin >= 0 && timeMin <= 5)) {
        setColorTime(true);
      } else {
        setColorTime(false);
      }

      if (!didRun.current) {
        didRun.current = true;

        const dateTxt =
          timeAll.getFullYear() +
          "/" +
          String(timeAll.getMonth() + 1).padStart(2, "0") +
          "/" +
          String(timeAll.getDate()).padStart(2, "0");

        setDateStr(dateTxt);

        const root = rootRef.current;
        if (root) {
          const pickupDayEl = root.querySelector("#pickupDay") as HTMLInputElement | null;
          const baseTimeEl = root.querySelector("#baseTime") as HTMLInputElement | null;

          if (pickupDayEl) pickupDayEl.value = dateTxt;
          if (baseTimeEl) baseTimeEl.value = `${dateTxt} 23:59:59`;
        }
      }
    }
  }, [data]);

  useEffect(() => {
    const decCount = () => {
      setMuteList((prev) =>
        prev.map((ms) => (ms > 15000 ? ms - 15000 : 0))
      );
    };

    const soundFlagSwitch = (): number => {
      let soundMode = 0;
      //setMute(0);

      items.forEach((item, index) => {
        if (
          muteList[index] <= 0 &&
          (item.trend >= 3 || item.trend <= -3) &&
          keepSound
        ) {
          soundMode = 1;
          //setMute(1);
        }
      });

      return soundMode;
    };

    const soundId = setInterval(() => {
      const soundFlag = soundFlagSwitch();
      decCount();

      if (denenRef.current) {
        denenRef.current.volume = soundFlag === 1 ? 1 : 0;
      }

      //setMute(soundFlag);
    }, 15000);

    decCount();

    if (denenRef.current) {
      denenRef.current.volume = soundFlagSwitch() === 1 ? 1 : 0;
    }

    return () => clearInterval(soundId);
  }, [data]);

  return (
    <div style={{ padding: 0 }}>
      <h1 className="mainTitle">トレンド監視ツール</h1>

      <div>
        <audio
          ref={denenRef}
          src="sound/Beethoven-Symphony-No6-1st-2020-AR-VR.mp3"
          loop
        />
        <audio ref={signalRef} src="sound/signal.wav" />
        <button className="muteButton" onClick={soundStop}>
          {keepSound ? "完全にミュートする" : "ミュートを解除する"}
        </button>
        <span className="muteStatus">
          {keepSound ? "再生中" : "ミュート中"}
        </span>
      </div>

      <div className="mute_disable" style={{ display: cloak ? "block" : "none" }}>
        <div className="md_inner">
          <p>ミュートを解除します</p>
          <button id="muteDisable" onClick={denenPlay}>
            解除
          </button>
        </div>
      </div>

      {data ? (
        <p className="serverTime">W: {data.pickup_world}</p>
      ) : (
        <p className="serverTime">W:読み込み中...</p>
      )}

      {error && <p style={{ whiteSpace: "pre-wrap" }}>{error}</p>}

      <div className="toolsFlex">
        <div
          className="trend-list"
          style={{
            borderLeft: colorTime
              ? "8px solid rgb(255, 60, 60)"
              : "8px solid rgb(136, 136, 136)",
          }}
        >
          <div>
            {items.map((item, i) => {
              let aoStatus = item.aoStatus.replaceAll("1", "＋");
              aoStatus = aoStatus.replaceAll("0", "－");
              aoStatus = aoStatus.replaceAll("p", "▲");
              aoStatus = aoStatus.replaceAll("m", "▽");

              let directionColor = "";
              if (item.trend >= 1) {
                directionColor = "#F00";
              } else if (item.trend <= -1) {
                directionColor = "#00F";
              } else {
                directionColor = "#AAA";
              }

              return (
                <div key={i} className="currencyBlock">
                  <div className="checkItem">
                    <div className="signalAnim current">
                      {(item.trend > 2 || item.trend < -2) && <div></div>}
                    </div>

                    <button
                      className="mute 0"
                      aria-label="ミュート時間60分追加"
                      onClick={() =>
                        setMuteList((prev) =>
                          prev.map((n, index) =>
                            index === i ? n + 3600000 : n
                          )
                        )
                      }
                    >
                      60
                    </button>

                    <button
                      className="muteB 0"
                      aria-label="ミュート時間5分追加"
                      onClick={() =>
                        setMuteList((prev) =>
                          prev.map((n, index) =>
                            index === i ? n + 300000 : n
                          )
                        )
                      }
                    >
                      5
                    </button>

                    <button
                      className="restart 0"
                      aria-label="ミュート時間リセット"
                      onClick={() =>
                        setMuteList((prev) =>
                          prev.map((n, index) => (index === i ? 0 : n))
                        )
                      }
                    >
                      RS
                    </button>

                    <div className="time time0">
                      {Math.floor((muteList[i] ?? 0) / 60000)}
                    </div>
                  </div>

                  <div>
                    <p
                      className="statusBox"
                      style={{
                        whiteSpace: "nowrap",
                        color: directionColor,
                        backgroundColor: muteList[i] <= 0 ? "#FFF" : "#DDD",
                        fontWeight:
                          item.trend > 1 || item.trend < -1 ? "bold" : "normal",
                      }}
                    >
                      {(item.trend > 2 || item.trend < -2) && <span>&lt;&lt;</span>}
                      {item.trend < -3 && <span>↑</span>}

                      {item.pair} {aoStatus}

                      <span className="f_min">&nbsp;&nbsp;3Deg: </span>
                      <span>{item.aveDiff}</span>&nbsp;&nbsp;

                      <span>
                        <span className="f_min">05Dif:</span> {item.limitDiff01}
                      </span>
                      &nbsp;

                      <span>
                        <span className="f_min">01Dif:</span> {item.limitDiff05}
                      </span>
                      &nbsp;B:{item.bolin05}_{item.bolin15}

                      {(item.trend > 2 || item.trend < -2) && <span>&gt;&gt;</span>}
                    </p>

                    <div className="timeGage">
                      {Array.from({ length: 62 }).map((_, idx) => (
                        <i key={idx}></i>
                      ))}
                    </div>

                    <div className="sigNow">
                      {previousSignals[i]?.map((value, index) =>
                        value === "3" ? (
                          <b key={index}></b>
                        ) : value === "-3" ? (
                          <p key={index}></p>
                        ) : (
                          <i key={index}></i>
                        )
                      )}
                    </div>

                    <div className="zoomDirection">
                      {previousSignalsDeg[i]?.map((value, index) => (
                        <p key={index}>{value}</p>
                      ))}
                    </div>

                    <button
                      className="dayListButton"
                      onClick={() => runPickup(item.pair, dateStr)}
                    >
                      本日推移
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TrendPickup ref={rootRef} />
      </div>
    </div>
  );
}
