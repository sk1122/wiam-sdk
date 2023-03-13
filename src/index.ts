import axios from "axios";
import { BASE_URL } from "./config";
import { Opts, WiamEvent, WiamEventName } from "./types";

class WIAM {
  private apiKey = "";
  private project: any = undefined;
  private user: any = undefined;
  private apiKeyVerified = false;
  private options: Opts | undefined = {} as Opts
  private recordingPageViews = false

  constructor(apiKey: string, options?: Opts) {
    this.options = options
    this.apiKey = apiKey;

    this.validateApiKey(apiKey);

    if (typeof window === "undefined") return;

    if(options && options.serviceWorker) {
      if(window && window.navigator) {
        window.navigator.serviceWorker.register(`/${options.serviceWorker}`).then(serviceWorker => {
          if(serviceWorker.installing) {
            console.log("SERVICE WORKER INSTALLING")
          } else if (serviceWorker.waiting) {
            console.log("SERVICE WORKER WAITING")
          } else if (serviceWorker.active) {
            console.log("SERVICE WORKER ACTIVE")
          }
        })
      } else {
        throw new Error("execute this code in a browser environment")
      }
    }

    if(options && options.recordPageViews) {
      if(window) this.autoPageViews()
      else throw new Error("execute this code in a browser environment")
    }

    const sessionId = window.localStorage.getItem("wiamSessionId")
    if(sessionId && sessionId.length > 0) {
      const user = window.localStorage.getItem("wiamUserId")
      this.user = {
        id: user
      }
      
      return
    }
  }

  // PUBLIC
  public async setWallet(address: string) {
    if (typeof window === "undefined") return;

    window.addEventListener("beforeunload", (event) => {
      this.removeWallet();

      event.returnValue = "toto"

      return "toto"
    });

    let running = window.localStorage.getItem("sessionRunning");

    if(running === 'true') return

    window.localStorage.setItem('running', 'true')
    
    const sessionId = window.localStorage.getItem("wiamSessionId");
    
    if (sessionId && sessionId.length > 0) {
      const sessionRes = await axios({
        method: 'GET',
        url: `${BASE_URL}/v1/events`,
        params: {
          id: sessionId
        },
        headers: {
          'secret-key': this.apiKey
        }
      })

      const session = await sessionRes.data

      if('endTime' in session.data.data && session.data.data.endTime) {
        window.localStorage.setItem("wiamSessionId", "")
        window.localStorage.setItem('running', 'false')
      }
      else {
        console.log(session.data, "123")
        this.communicateToServiceWorker({
          key: "wiamSessionId",
          value: session.data.iamUserId
        })
        this.communicateToServiceWorker({
          key: "wiamProjectId",
          value: session.data.projectId
        })
        return
      };
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
          headers: {
            'secret-key': this.apiKey
          }
        });

        this.user = req.data.data;

        window.localStorage.setItem("wiamUserId", this.user.id)
        this.communicateToServiceWorker({
          key: "wiamSessionId",
          value: this.user.id
        })
      } catch (e) {
        const req = await axios({
          url: `${BASE_URL}/v1/iam`,
          method: "GET",
          params: {
            address,
            project: this.project.id,
          },
          headers: {
            'secret-key': this.apiKey
          }
        });

        this.user = req.data.data;
        window.localStorage.setItem("wiamUserId", this.user.id);
        this.communicateToServiceWorker({
          key: "wiamSessionId",
          value: this.user.id
        })
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
      window.localStorage.setItem('running', 'false')
    }
  }

  public async removeWallet() {
    // if (typeof window === "undefined") return;

    // if (window && window.localStorage) {
    try {
      const sessionId = window.localStorage.getItem("wiamSessionId");
      console.log(sessionId, 'window.session')
      if (!sessionId) return;
  
      console.log("called")
      const sessionRes = await axios({
        method: 'GET',
        url: `${BASE_URL}/v1/events`,
        params: {
          id: sessionId
        },
        headers: {
          'secret-key': this.apiKey
        }
      })

      const session = await sessionRes.data
      
      // alert(session.data.data.startTime);
      window.localStorage.setItem("wiamSessionId", "")
  
      const data = await this.registerEvent({
        name: 'wallet_removed',
        data: {
          id: sessionId,
          address: session.data.data.address,
          startTime: session.data.data.startTime,
          endTime: new Date(),
          iamHere: true
        },
      });

      return "yoyoy"
    } catch (e: any) {
      console.log(e)
    }
    // }
  }

  public async setPageView() {
    if (typeof window == "undefined") return;

    const pageUrl = window.location.href;
    const referrer = window.document.referrer;

    this.registerEvent({
      name: WiamEventName.PAGE_VIEWED,
      data: {
        url: pageUrl,
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
  private communicateToServiceWorker(data: any) {
    if(window && window.navigator) {
      window.navigator.serviceWorker.controller?.postMessage(data)
    } else {
      throw new Error("call this inside a browser env")
    }
  }

  private async registerEvent(event: WiamEvent) {
    if (!this.project || !this.apiKey) return
    if (!this.user) return

    console.log(this.project, event, "!23")
    if (!event.name) throw new Error("event.name should be a non-empty string");
    try {
      const request = await axios({
        url: `${BASE_URL}/v1/events`,
        method: "POST",
        data: {
          name: event.name,
          data: event.data,
          project: this.project.id,
          iamUser: this.user.id,
	        blockchain: "SOLANA"
        },
        headers: {
          'secret-key': this.apiKey
        }
      });

      if (request.status >= 400) throw new Error();

      return request.data;
    } catch (e: any) {
      console.log(e, "12")
      if (e && e.response && e.response.data)
        throw new Error(e.response.data.error);

      throw new Error("Can't register event right now");
    }
  }

  private async validateApiKey(apiKey: string) {
    // if (!this.apiKey) throw new Error("apiKey should be a non-empty string");

    const req = await axios({
      url: `${BASE_URL}/v1/project`,
      method: 'GET',
      params: {
        key: apiKey
      },
      headers: {
        'secret-key': apiKey
      }
    })

    this.project = req.data.data

    this.communicateToServiceWorker({
      key: "wiamProjectId",
      value: this.project.id
    })
    this.apiKeyVerified = true;
  }
}

export default WIAM;
