import { useEffect, useRef, forwardRef } from "react";
import $ from "jquery";

window.$ = $;
window.jQuery = $;

await import("jquery-ui-dist/jquery-ui");
import "jquery-ui-dist/jquery-ui.css";
import * as d3 from "d3";
import c3 from "c3";
import "c3/c3.css";

window.d3 = d3;
window.c3 = c3;

type DayPickupItem = {
  sum_5min: number;
  bucket_start: string;
};

type DayPickupResponse = {
  ok: boolean;
  data: DayPickupItem[];
};

type ShortPickupItem = {
  bolin15: number;
  datetime: string;
};

type ShortPickupResponse = {
  ok: boolean;
  data: ShortPickupItem[];
  span: string;
};

type TrendPickupProps = {};

const TrendIsland = forwardRef<HTMLDivElement, TrendPickupProps>(function JqTrendPickup(_props, ref) {

//const TrendIsland = forwardRef<HTMLDivElement, Record<string>>(function JqTrendPickup(_props, ref) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const currentUrl = window.location.href;
    const defaultApiPath30 =
      currentUrl.indexOf("trend-pickupper9.sakura.ne.jp") > -1
        ? "./api/status_pickup_sa.php"
        : "./api/status_pickup.php";

    const defaultApiPathDay =
      currentUrl.indexOf("trend-pickupper9.sakura.ne.jp") > -1
        ? "./api/status_pickup_day_sa.php"
        : "./api/status_pickup_day.php";

    const qs = <T extends Element>(sel: string) =>
      root.querySelector(sel) as T | null;

    const pairEl = qs<HTMLSelectElement>("#pair");
    const pickupDayEl = qs<HTMLInputElement>("#pickupDay");
    const baseTimeEl = qs<HTMLInputElement>("#baseTime");
    const previousRimitEl = qs<HTMLSelectElement>("#previousRimit");
    const outputJSONEl = qs<HTMLPreElement>("#outputJSON");
    const pickupSpanEl = qs<HTMLDivElement>("#pickupSpan");
    const shortChartBoxEl = qs<HTMLDivElement>(".shortChartBox");
    const dateCopiedEl = qs<HTMLSpanElement>(".dateCopied");
    const trendChartEl = qs<HTMLDivElement>("#trendChart");
    const dayTrendChartEl = qs<HTMLDivElement>("#dayTrendChart");

    const addTimeBtn = qs<HTMLButtonElement>("#addTime");
    const subtractTimeBtn = qs<HTMLButtonElement>("#subtractTime");
    const dayPickupBtn = qs<HTMLButtonElement>("#dayPickupBtn");
    const pickupBtn = qs<HTMLButtonElement>("#pickupBtn");
    const readAction = qs<HTMLSpanElement>("#readAction");
    const readAction2 = qs<HTMLSpanElement>("#readAction2");

    if (
      !pairEl ||
      !pickupDayEl ||
      !baseTimeEl ||
      !previousRimitEl ||
      !outputJSONEl ||
      !pickupSpanEl ||
      !shortChartBoxEl ||
      !dateCopiedEl ||
      !trendChartEl ||
      !dayTrendChartEl ||
      !addTimeBtn ||
      !subtractTimeBtn ||
      !dayPickupBtn ||
      !pickupBtn ||
      !readAction ||
      !readAction2
    ) {
      console.error("必要なDOMが見つかりません（島のHTMLを確認してください）");
      return;
    }

    if (window.jQuery && window.jQuery.fn?.datepicker) {
      window.jQuery(pickupDayEl).datepicker({ dateFormat: "yy/mm/dd" });
    } else {
      console.warn("jQuery UI datepicker が読み込まれていません");
    }

    const formatLocal = (dt: Date): string => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return (
        `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ` +
        `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
      );
    };

    let trendJson = "";

//    let shortChart: c3.ChartAPI | null = null;
//    let dayChart: c3.ChartAPI | null = null;

    let shortChart: ReturnType<typeof c3.generate> | null = null;
    let dayChart: ReturnType<typeof c3.generate> | null = null;

    const onAddTime = () => {
      let baseTime = baseTimeEl.value.trim();
      const s = baseTime.replaceAll("/", "-");
      const d = new Date(s.replace(" ", "T"));
      d.setMinutes(d.getMinutes() + 5);
      baseTime = formatLocal(d).replaceAll("-", "/");
      baseTimeEl.value = baseTime;
    };

    const onSubtractTime = () => {
      let baseTime = baseTimeEl.value.trim();
      const s = baseTime.replaceAll("/", "-");
      const d = new Date(s.replace(" ", "T"));
      d.setMinutes(d.getMinutes() - 5);
      baseTime = formatLocal(d).replaceAll("-", "/");
      baseTimeEl.value = baseTime;
    };

    const onDayPickup = async () => {
      const pair = pairEl.value.trim();
      const pickupDay = pickupDayEl.value.trim().replaceAll("/", "-");

      const url = `${defaultApiPathDay}?pair=${encodeURIComponent(pair)}&pickupDay=${encodeURIComponent(pickupDay)}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as DayPickupResponse;

      trendJson = JSON.stringify(json, null, 2);
      outputJSONEl.textContent = trendJson;

      if (!json?.ok) return;

      const datetime: (string | number)[] = ["datetime"];
      const bolinger: (string | number)[] = ["bolinger"];
      let existFlag = false;

      json.data.forEach((item) => {
        bolinger.push(Math.round(item.sum_5min / 20));
        datetime.push(item.bucket_start);

        if (item.sum_5min !== 0) {
          existFlag = true;
        }
      });

      if (!existFlag) {
        dayTrendChartEl.innerHTML = "<span class='emptyMessage'>指定日のデータ表示なし</span>";
        trendChartEl.innerHTML =
          "<span class='emptyMessage'>指定時間データ表示なし<br />日推移データグラフのバーをクリックしてから実行します。</span>";
        pickupSpanEl.innerHTML = "抽出範囲: ----/--/--";
        pickupBtn.disabled = true;
        return;
      }

      if (dayChart?.destroy) dayChart.destroy();

      pickupBtn.disabled = false;
      readAction.innerHTML = "<span></span>";

      dayTrendChartEl.style.width = "800px";

      dayChart = c3.generate({
        bindto: dayTrendChartEl,
        data: {
          x: "datetime",
          columns: [datetime, bolinger],
          type: "bar",
          color: function (color: string, d: { index: number } | undefined) {
            if (!d) return color;
//console.log(datetime);
//console.log(bolinger);
            const value = Number(bolinger[d.index + 1] ?? 0);

            if (value > 0) return "#F55";
            if (value < 0) return "#55F";
            return "#999";
          },
          onclick: async function (d: { index: number }) {
            const label = String(datetime[d.index + 1] ?? "");
            const text = `${label}`;
            baseTimeEl.value = text;
            dateCopiedEl.innerHTML = "<span>&nbsp;Copied</span>";

            try {
              await navigator.clipboard.writeText(text);
            } catch {
              const ta = document.createElement("textarea");
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              document.body.removeChild(ta);
            }
          },
        },
        axis: { x: { type: "category" } },
      });
    };

    const onPickup = async () => {
      const pair = pairEl.value.trim();
      let previousRimit = previousRimitEl.value.trim();
      let baseTime = baseTimeEl.value.trim();
      if (previousRimit === "") previousRimit = "10";

      const s = baseTime.replaceAll("/", "-");
      const d = new Date(s.replace(" ", "T"));
      d.setMinutes(d.getMinutes() - Number(previousRimit));
      const previousTime = formatLocal(d).replaceAll("-", "/");

      baseTime = baseTime.substring(0, 17) + "59";

      const url = `${defaultApiPath30}?pair=${encodeURIComponent(pair)}&previousTime=${encodeURIComponent(previousTime)}&baseTime=${encodeURIComponent(baseTime)}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as ShortPickupResponse;

      trendJson = JSON.stringify(json, null, 2);
      outputJSONEl.textContent = trendJson;

      readAction2.innerHTML = "<span></span>";

      if (!json?.ok) {
        trendChartEl.innerHTML =
          "<span class='emptyMessage'>指定時間データ表示なし<br />日推移データグラフのバーをクリックしてから実行します。</span>";
        return;
      }

      const datetime: (string | number)[] = ["datetime"];
      const bolinger: (string | number)[] = ["bolinger"];

      json.data.forEach((item) => {

        //console.log(item);

        bolinger.push(item.bolin15);
        datetime.push(item.datetime);
      });

      pickupSpanEl.textContent = "抽出範囲: " + json.span;

      if (previousRimit === "10") shortChartBoxEl.style.width = "300px";
      else if (previousRimit === "20") shortChartBoxEl.style.width = "600px";
      else shortChartBoxEl.style.width = "800px";

      if (shortChart?.destroy) shortChart.destroy();

      shortChart = c3.generate({
        bindto: trendChartEl,
        data: {
          x: "datetime",
          columns: [datetime, bolinger],
          type: "bar",
          color: function (color: string, d: { index: number } | undefined) {
            if (!d) return color;

            const value = Number(bolinger[d.index + 1] ?? 0);

            if (value > 0) return "#F55";
            if (value < 0) return "#55F";
            return "#999";
          },
          onclick: async function (d: { index: number }) {
            const label = String(datetime[d.index + 1] ?? "");
            const text = `${label}:59`;
            try {
              await navigator.clipboard.writeText(text);
            } catch {
              const ta = document.createElement("textarea");
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              document.body.removeChild(ta);
            }
          },
        },
        axis: { x: { type: "category" } },
      });
    };

    addTimeBtn.addEventListener("click", onAddTime);
    subtractTimeBtn.addEventListener("click", onSubtractTime);
    dayPickupBtn.addEventListener("click", onDayPickup);
    pickupBtn.addEventListener("click", onPickup);

    return () => {
      addTimeBtn.removeEventListener("click", onAddTime);
      subtractTimeBtn.removeEventListener("click", onSubtractTime);
      dayPickupBtn.removeEventListener("click", onDayPickup);
      pickupBtn.removeEventListener("click", onPickup);

      try {
        if (window.jQuery && window.jQuery.fn?.datepicker) {
          window.jQuery(pickupDayEl).datepicker("destroy");
        }
      } catch {}

      try {
        shortChart?.destroy?.();
      } catch {}

      try {
        dayChart?.destroy?.();
      } catch {}
    };
  }, []);

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
    >
      <div className="wrapper">
        <h2>過去のトレンド可視化</h2>

        <div className="chartSettings">
          <div className="dayChartSetting">
            <label>
              対象通貨:
              <select id="pair" defaultValue="USDJPY">
                <option value="USDJPY">USD/JPY</option>
                <option value="AUDJPY">AUD/JPY</option>
                <option value="EURJPY">EUR/JPY</option>
                <option value="NZDJPY">NZD/JPY</option>
                <option value="CADJPY">CAD/JPY</option>
                <option value="CHFJPY">CHF/JPY</option>
                <option value="AUDUSD">AUD/USD</option>
                <option value="EURUSD">EUR/USD</option>
                <option value="NZDUSD">NZD/USD</option>
                <option value="USDCAD">USD/CAD</option>
                <option value="USDCHF">USD/CHF</option>
                <option value="EURGBP">EUR/GBP</option>
                <option value="EURAUD">EUR/AUD</option>
                <option value="GBPAUD">GBP/AUD</option>
              </select>
            </label>
            <br />
            <label>
              指定日:
              <input id="pickupDay" type="text" defaultValue="2026/02/17" />
            </label>
            <br />
            <button id="dayPickupBtn" type="button">
              日推移
            </button>
            <span id="readAction"></span>
            <br />
          </div>

          <div className="shortChartSetting">
            <label>
              指定時間:
              <input id="baseTime" defaultValue="2026/02/17 17:30:59" disabled />
              <button id="subtractTime" type="button">
                -
              </button>
              <button id="addTime" type="button">
                +
              </button>
              <span className="dateCopied"></span>
            </label>
            <br />
            <label>
              巻戻時間:
              <select id="previousRimit" defaultValue="30">
                <option value="30">30分</option>
                <option value="20">20分</option>
                <option value="10">10分</option>
              </select>
            </label>
            <br />
            <button id="pickupBtn" type="button" disabled>
              指定時間データ出力
            </button>
            <span id="readAction2"></span>
          </div>
        </div>

        <h3 className="h3Title">日推移データ</h3>
        <div className="dayChartBox">
          <div id="dayPickupSpan"></div>
          <div id="dayTrendChart">
            <span className="emptyMessage">日推移データ表示なし</span>
          </div>
        </div>

        <h3 className="h3Title">指定時間データ</h3>
        <div className="shortChartBox">
          <div id="pickupSpan">抽出範囲: ----/--/--</div>
          <div id="trendChart">
            <span className="emptyMessage">
              指定時間データ表示なし
              <br />
              日推移データグラフのバーをクリックしてから実行します。
            </span>
          </div>
        </div>

        <pre id="outputJSON"></pre>
      </div>
    </div>
  );
});

export default TrendIsland;
