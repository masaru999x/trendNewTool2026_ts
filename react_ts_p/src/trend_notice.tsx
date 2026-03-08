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
  const rootRef = useRef(null);

  //APIパス自動切換
  const currentUrl = window.location.href;
  const defaultApiPath = (currentUrl.indexOf("trend-pickupper9.sakura.ne.jp") > -1) ? "./api/pickup_json_sa_v1.php" : "./api/pickup_json_v1.php";

  const runPickup = (pair, day) => {

    //console.log(dateStr);
    const root = rootRef.current;
    root.querySelector("#pair").value = pair;
    root.querySelector("#pickupDay").value = day;
    root.querySelector("#dayPickupBtn").click();
  }

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  //再生判定変数
  const [muteFlag, setMute] = useState(0);
  //再生クローク判定
  const [cloak, setCloak] = useState(true);
  //音声 完全停止
  const [keepSound, setKeepSound] = useState(true);

  const [dateStr, setDateStr] = useState("");

  const prevSig = useRef([]);

  const [startSignalList, setStartSignalList] = useState([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ]);

  const [muteList, setMuteList] = useState([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ]);

  const [signalFlag, setSignalList] = useState([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ]);

  //シグナルゲージ用配列
  const [previousSignals, setPreviousSignals] = useState([
    [], [], [], [], [], [], [], [], [], [], [], [], [], []
  ]);
  //過去ボリン角度用配列
  const [previousSignalsDeg, setPreviousSignalsDeg] = useState([
    [], [], [], [], [], [], [], [], [], [], [], [], [], []
  ]);

  const [colorTime, setColorTime] = useState(false);

  const denenRef = useRef(null);
  const denenPlay = () => {
    denenRef.current.volume = 0;
    denenRef.current.play();
    setCloak(false);
  };



  const signalRef = useRef(null);
  const signalPlay = () => {
    signalRef.current.volume = 1;
    signalRef.current.play();
  };

//  const stopRef = useRef(null);
  const soundStop = () => {
    if (keepSound) {
      setKeepSound(false);
    } else {
      setKeepSound(true);
    }
  };

  //const islandRef = useRef(null);


  useEffect(() => {
    async function fetchData() {
      fetch(defaultApiPath)
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

        return JSON.parse(text);
      })
      .then(setData)
      .catch((e) => setError(String(e)));
//ここでもできる
    }

    fetchData(); // 初回実行

    const interval = setInterval(() => {
      fetchData();

    }, 15000); // 15000ms = 15秒

    return () => clearInterval(interval); // ← 超重要（クリーンアップ）
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

  // 配列を取り出す（APIの形が違っても対応）
  /*
  const items =
  Array.isArray(data) ? data :
  Array.isArray(data?.data) ? data.data :
  Array.isArray(data?.currency) ? data.currency :
  [];
*/


///////////////////////////////////////////////////////////

let nowSignal = false;
let timeAll;
let timeMin;
let timeMinInt
const didRun = useRef(false);

  useEffect(() => {
    prevSig.current = [...startSignalList];

    data?.currency?.forEach((inValue, inCount) => {
      previousSignals[inCount].push(inValue[1]);

      if (previousSignals[inCount].length > 240) {
        previousSignals[inCount].shift();
      }

      previousSignalsDeg[inCount].push(inValue[9]);
      if (previousSignalsDeg[inCount].length > 10) {
        previousSignalsDeg[inCount].shift();
      }
      startSignalList[inCount] = parseInt(inValue[1]);

    });

    nowSignal = false;

    prevSig.current.forEach((inValue, inCount) => {
      if (startSignalList[inCount] == 3 || startSignalList[inCount] == -3 || startSignalList[inCount] == -4) { //3，-3に加えて、-4逆張りも追加
        if (prevSig.current[inCount] < 3 || prevSig.current[inCount] > -3) {
          if (startSignalList[inCount] != prevSig.current[inCount]) {
            nowSignal = true;
          }
        }
      }
    });

    if (nowSignal && keepSound) {
      signalPlay();
    }

    if (data) {
      timeAll = new Date(data.pickup_world);
      timeMin = timeAll.getMinutes();
      timeMinInt = parseInt(timeMin);

      if (timeMinInt >= 50 && timeMinInt <= 59) {
        setColorTime(true);
      } else if (timeMinInt >= 0 && timeMinInt <= 5) {
        setColorTime(true);
      } else {
        setColorTime(false);
      }

      //いっかいだけ処理
      if (didRun.current) return;
        didRun.current = true;
        let dateTxt = timeAll.getFullYear() + "/" + (timeAll.getMonth()+1).toString().padStart(2, "0") + "/" + (timeAll.getDay()+1).toString().padStart(2, "0");
        setDateStr(dateTxt);
        root.querySelector("#pickupDay").value = dateTxt;
        root.querySelector("#baseTime").value = dateTxt + " 23:59:59";

    }

  }, [data]);


  useEffect(() => {
    const decCount = () => {
      setMuteList(prev => prev.map(ms => (ms > 15000 ? ms - 15000 : 0)));
    }

    const soundFlagSwitch = () => {
      let soundMode = 0; //初期化
      setMute(0);

      data?.currency?.forEach((inValue, inCount) => {
        if (parseInt(muteList[inCount]) <= 0 && (parseInt(inValue[1]) >= 3 || parseInt(inValue[1]) <= -3) && keepSound) {
          soundMode = 1;//田園再生
          setMute(1);
        }

      });


      return soundMode;
    }


    //最終的な駆動 （１：15秒 音量操作 ２：データ更新）
    const soundId = setInterval(() => {

      let soundFlag = soundFlagSwitch(); //田園 音量フラグ
      decCount(); //ミュートカウンター 減算
      denenRef.current.volume = (soundFlag == 1) ? 1 : 0; //音量追加
      setMute(soundFlag);

    }, 15000);

    decCount();//初回実行
    denenRef.current.volume = (soundFlagSwitch() == 1) ? 1 : 0; //初回実行

    return () => clearInterval(soundId);
  }, [data]);

/////////////////////////////////////////////////



  return (
    <div style={{ padding: 0 }}>

    <h1 className="mainTitle">トレンド監視ツール</h1>

    <div>
      <audio ref={denenRef} src="sound/Beethoven-Symphony-No6-1st-2020-AR-VR.mp3" loop />
      <audio ref={signalRef} src="sound/signal.wav" />
      <button className="muteButton" onClick={soundStop}>{keepSound ? "完全にミュートする":"ミュートを解除する"}</button><span className="muteStatus">{keepSound ? "再生中":"ミュート中"}</span>
    </div>

    <div className="mute_disable" style={{display: cloak ? "block" : "none"}}><div className="md_inner"><p>ミュートを解除します</p><button id="muteDisable" onClick={denenPlay}>解除</button></div></div>

    {data ? (
      <p className="serverTime">W: {data.pickup_world}</p>
    ) : (
      <p className="serverTime">W:読み込み中...</p>
    )}



<div className="toolsFlex">
    <div className="trend-list" style={{ borderLeft: colorTime ? "8px solid rgb(255, 60, 60)" : "8px solid rgb(136, 136, 136)" }}>

    {
      <div>
      {items.map((item, i) => {
        const aoStatusBase = item.aoStatus ?? "";
        let aoStatus = aoStatusBase.replaceAll('1', '＋');
        aoStatus = aoStatus.replaceAll('0', '－');
        aoStatus = aoStatus.replaceAll('p', '▲');
        aoStatus = aoStatus.replaceAll('m', '▽');

        let directionColor = "";
        if (parseInt(item.trend) >= 1) {
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
          {(item.trend > 2 || item.trend < -2) && (<div></div>)}
          </div>

          <button className="mute 0" aria-label="ミュート時間60分追加"
          onClick={() =>
            setMuteList(prev =>
              prev.map((n, index) =>
                index === i ? n + 3600000 : n
              )
            )
          }
          >60</button>
          <button className="muteB 0" aria-label="ミュート時間5分追加"
          onClick={() =>
            setMuteList(prev =>
              prev.map((n, index) =>
                index === i ? n + 300000 : n
              )
            )
          }
          >5</button>
          <button className="restart 0" aria-label="ミュート時間リセット"
          onClick={() =>
            setMuteList(prev =>
              prev.map((n, index) =>
                index === i ? 0 : n
              )
            )
          }
          >RS</button>

          <div className="time time0">
            {Math.floor((muteList[i] ?? 0) / 60000)}
          </div>
          </div>

          <div>
          <p className="statusBox" style={{ whiteSpace: "nowrap", color: directionColor, backgroundColor: (muteList[i] <= 0) ? "#FFF" : "#DDD", fontWeight: item.trend > 1 || item.trend < -1 ? "bold" : "normal" }}>
          {item.trend > 2 || item.trend < -2 &&  <span>&lt;&lt;</span> } {item.trend < -3 &&  <span>↑</span> }
          {item.pair} {aoStatus}
          <span className="f_min">&nbsp;&nbsp;3Deg: </span>
          <span>{item.aveDiff}</span>&nbsp;&nbsp;<span>
          <span className="f_min">05Dif:</span> {item.limitDiff05}</span>&nbsp;<span>
          <span className="f_min">01Dif:</span> {item.limitDiff01}</span>&nbsp;B:{item.bolin05}_{item.bolin15}
          {item.trend > 2 || item.trend < -2 && ( <span>&gt;&gt;</span> )}
          </p>
          <div className="timeGage">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
          <div className="sigNow">
          {
            previousSignals[i].map((value, index) =>
              value === "3" ? (
                <b key={index}></b>
              ) : value === "-3" ? (
                <p key={index}></p>
              ) : (
                <i key={index}></i>
              )
            )
          }
          </div>
          <div className="zoomDirection">
          {
            previousSignalsDeg[i].map((value, index) =>
              (
                <p key={index}>{value}</p>
              )
            )
          }
          </div>
          <button className="dayListButton" onClick={() => runPickup(item.pair, dateStr)}>本日推移</button>
          </div>

          </div>
        );
      })}
      </div>
    }

    </div>
{/* デバッグ用に下に生データも出す
<hr />
<pre style={{ whiteSpace: "pre-wrap" }}>
{data ? JSON.stringify(data, null, 2) : "Loading..."}
</pre>
*/}


    <TrendPickup ref={rootRef} />
    </div>
</div>

);
}
