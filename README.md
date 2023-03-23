# WIAM SDK

![Cover Image](https://pbs.twimg.com/profile_banners/1626244560585388032/1677599782/1500x500)

WIAM helps Solana dApps to take data driven decisions by providing state of the class analytics services. This is a JS SDK with inbuilt TS types that helps Solana dApps to track activity on their dApp more easily.

**What metrics does WIAM capture?**

- Connected wallet addresses
    - Transaction executed
- Transactions
    - Volume
    - Status
- Retention rate
- Bounce rate
- Page views
    - referrer
- Heatmaps (Coming soon)

All of these metrics are available in our best-in-class intuitive dashboard.

We also let you to export all of the connected addresses as a `.csv` which you can use then to airdrop rewards, also building a feature where you can do that inside our dashboard itself.

## Installation

`yarn add wiam`

## Usage

You just have to send the connected wallet address to our SDK and rest of the tracking is handled by us.

You have to publically serve `service-worker.js`, if using `react` or `next`, upload this to `public` folder and send file's name in the options, FYI the file should be publically available at `https://domain.com/service-worker.js`

```typescript
import WIAM from "wiam"

const wiam = new WIAM("API_KEY", {
    serviceWorker: "service-worker.js"
})

const App = () => {
    const { publicKey } = useWallet()

    useEffect(() => {
        if(publicKey) {
            wiam.setWallet(publicKey.toString())
        }
    }, [publicKey])
}

export default App
```

## Open Source

Project is fully opensource from frontend to backend to SDK

[Frontend](https://github.com/sk1122/wiam-grizzlython)
[Backend](https://github.com/sk1122/web3-iam)

