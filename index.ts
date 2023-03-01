import axios from "axios";
import { BASE_URL } from "./config";
import { WiamEvent, WiamEventName } from "./types";

class WIAM {
  private apiKey = "";
  private project: any = undefined;
  private user: any = undefined;
  private apiKeyVerified = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;

    this.validateApiKey();

    if (typeof window === "undefined") return;

    const sessionId = window.localStorage.getItem("wiamSessionId")
    if(sessionId && sessionId.length > 0) {
      const user = window.localStorage.getItem("wiamUserId")
      this.user = {
        id: user
      }
      
      return
    }

    if (window) {
      console.log("1234")
      window.addEventListener("beforeunload", (event) => {
        // event.preventDefault()
        // alert("!2")
        this.removeWallet();
      });
    }
  }

  // PUBLIC
  public async setWallet(address: string) {
    if (typeof window === "undefined") return;
    
    const sessionId = window.localStorage.getItem("wiamSessionId");
    if (sessionId && sessionId.length > 0) {
      console.log("1")
      return;
    }
    
    if (!this.user) {
      try {
        const req = await axios({
          url: `${BASE_URL}/v1/iam`,
          method: "POST",
          data: {
            address,
            project: this.project.id,
            blockchains: ["SOLANA"],
          },
        });

        this.user = req.data.data;

        window.localStorage.setItem("wiamUserId", this.user.id)
      } catch (e) {
        const req = await axios({
          url: `${BASE_URL}/v1/iam`,
          method: "GET",
          params: {
            address,
            project: this.project.id,
          },
        });

        this.user = req.data.data;
        window.localStorage.setItem("wiamUserId", this.user.id);
      }
    }

    const data = await this.registerEvent({
      name: WiamEventName.WALLET_CONNECTED,
      data: {
        address,
        startTime: new Date(),
      },
    });

    if (window && window.localStorage) {
      window.localStorage.setItem("wiamSessionId", data.data.id);
    }
  }

  public async removeWallet() {
    // if (typeof window === "undefined") return;

    // if (window && window.localStorage) {
      const sessionId = window.localStorage.getItem("wiamSessionId");

      if (!sessionId) return;

      console.log("called")
      const session = await axios({
        method: 'GET',
        url: `${BASE_URL}/v1/events`,
        params: {
          id: sessionId
        }
      })

      window.localStorage.setItem("wiamSessionId", "")

      alert(session.data.data.data.startTime);

      const data = await this.registerEvent({
        name: WiamEventName.WALLET_REMOVED,
        data: {
          id: sessionId,
          startTime: session.data.data.data.startTime,
          endTime: new Date(),
        },
      });
    // }
  }

  public async setPageView() {
    if (typeof window == "undefined") return;

    const pageUrl = window.location.href;
    const referrer = window.document.referrer;

    this.registerEvent({
      name: WiamEventName.PAGE_VIEWED,
      data: {
        pageUrl,
        referrer,
      },
    });
  }

  public autoPageViews() {
    this.setPageView();

    const track = () => this.setPageView();
    const original = history.pushState;

    // monkey patch pushState
    if (original) {
      history.pushState = function (data, unused, url) {
        original.call(this, data, unused, url);
        track();
      };
      addEventListener("popstate", track);
    }

    return function () {
      if (original) {
        history.pushState = original;
        removeEventListener("popstate", track);
      }
    };
  }

  // PRIVATE
  private async registerEvent(event: WiamEvent) {
    console.log(this.apiKeyVerified, this.project, this.user, "12")
    if (!this.apiKeyVerified) throw new Error("apiKey is invalid");
    if (!this.project) return
    if (!this.user) return

    if (!event.name) throw new Error("event.name should be a non-empty string");
    try {
      const request = await axios({
        url: `${BASE_URL}/v1/events`,
        method: "POST",
        data: {
          ...event,
          project: this.project.id,
          iamUser: this.user.id,
	        blockchain: "SOLANA"
        },
      });

      if (request.status >= 400) throw new Error();

      return request.data;
    } catch (e) {
      console.log(e, "12")
      if (e && e.response && e.response.data)
        throw new Error(e.response.data.error);

      throw new Error("Can't register event right now");
    }
  }

  private async validateApiKey() {
    if (!this.apiKey) throw new Error("apiKey should be a non-empty string");

    const req = await axios({
      url: `${BASE_URL}/v1/project`,
      method: 'GET',
      params: {
        key: this.apiKey
      }
    })

    this.project = req.data.data
    this.apiKeyVerified = true;
  }
}

export default WIAM;
