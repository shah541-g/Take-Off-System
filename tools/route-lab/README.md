# Route Lab

A browser-based control room for the Time-Off system.

## Open It

Open `tools/route-lab/index.html` directly in a browser.

## Start Services

Run the main app and mock HCM server in separate terminals:

```powershell
npm run start
```

```powershell
cd mock-hcm
npm start
```

## Defaults

- Take-Off service: `http://localhost:3000`
- Mock HCM service: `http://localhost:3001`

You can change both base URLs from the top of the page and save them locally.

## What It Can Do

- Check health for both services
- Query balances and employee requests
- Create, approve, reject, and cancel requests
- Trigger sync and drift-detection calls
- Change mock HCM behavior and reset seed data
- Send any custom request from the built-in console
