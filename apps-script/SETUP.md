# Leads → Google Sheets + email: setup

How a lead travels:

```
Counselling form (index.html)
  → POST /api/lead              Netlify function netlify/functions/lead.mjs: re-checks the lead,
                                adds the secret, never exposes the Apps Script URL
  → Apps Script web app         apps-script/Code.gs: appends a row to the "Leads" tab and
                                emails business@tuteeconnect.com (Email.html)
```

Netlify Forms is not used. The form no longer posts to `/api/enquiry` (Resend / Supabase).

Allow about 15 minutes. You need the Google account that should own the sheet and send the emails
(ideally a shared business account, not a personal one).

## Using a spreadsheet you already have (e.g. the Singapore one)

The script can write into an existing spreadsheet as a **new tab, "New Zealand Leads"**, without touching the
other tabs or their scripts. Do this instead of step 1:

1. Open <https://script.google.com> → **New project** (a separate project, not the Singapore one) and paste in
   `Code.gs`, an HTML file named `Email` and `appsscript.json`, as in step 1.3.
2. Copy the spreadsheet's ID from its address: `https://docs.google.com/spreadsheets/d/`**`THIS-PART`**`/edit`.
3. In Script Properties (step 2), add `SPREADSHEET_ID` = that ID, as well as `LEAD_SECRET`.
4. Continue from step 3. `setup` creates the "New Zealand Leads" tab. The spreadsheet's timezone is not
   changed; date and time are written in India time.
## 1. Create the sheet and the script

1. Go to <https://sheets.new> (signed in to that account) and name it, e.g. **Tutee Connect · NZ leads**.
2. In the sheet: **Extensions → Apps Script**. A script editor opens, bound to this sheet.
3. In the editor:
   - Rename the project (top left), e.g. **NZ lead capture**.
   - Open **Code.gs**, delete what is there, and paste in the whole of `apps-script/Code.gs`.
   - Click **+** next to *Files* → **HTML**, name it exactly `Email` (the editor adds `.html`), and paste in
     `apps-script/Email.html`.
   - **Project Settings** (gear icon) → tick **Show "appsscript.json" manifest file in editor**. Go back to the
     editor, open `appsscript.json` and replace it with `apps-script/appsscript.json`. This sets India time and
     asks only for "this spreadsheet" and "send email" permissions.
4. Press **Ctrl+S** to save.

## 2. Set the shared secret

1. Make a long random string (30+ characters) and keep it for step 4. Use your password manager's generator,
   or run `[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()` in PowerShell.
2. In the Apps Script editor: **Project Settings → Script Properties → Add script property**.
   - Property: `LEAD_SECRET`
   - Value: your random string
3. Click **Save script properties**.

## 3. Build the table and authorise

1. In the editor, choose the function **setup** in the toolbar dropdown and click **Run**.
2. Google asks for permission. Click **Review permissions**, choose the account, then **Advanced → Go to NZ lead
   capture (unsafe)** → **Allow**. ("Unsafe" only means Google hasn't reviewed your own script.)
3. Open the sheet. A **Leads** tab now exists with the formatted header row, ready for the first lead:
   Date · Time · Full Name · Phone Number · Email · State · Shortlisted Universities · Course · Lead Source ·
   Preferred Call Time.
4. Optional: choose **sendTestLead** and **Run**. A test row appears and the email arrives at
   business@tuteeconnect.com. Delete that row afterwards.

## 4. Deploy as a web app

1. **Deploy → New deployment**. Click the gear next to *Select type* → **Web app**.
   - Description: `v1`
   - Execute as: **Me**
   - Who has access: **Anyone**. Netlify has no Google login; the shared secret is what keeps others out.
2. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

## 5. Connect Netlify

In Netlify: **Site configuration → Environment variables → Add a variable**. Add both, for all deploy contexts:

| Key | Value |
|---|---|
| `APPS_SCRIPT_URL` | the `/exec` URL from step 4 |
| `LEAD_SECRET` | the same random string as in step 2 |

Then **Deploys → Trigger deploy → Deploy site**. The variables only take effect after a new deploy.

## 6. Test it live

1. Open `https://<your-site>/api/lead`. You should see `"configured":true`.
2. Submit the counselling form on the live page with your own details.
3. Check that a new row appears in **Leads** and the email arrives at business@tuteeconnect.com. Pressing
   **Reply** in that email writes to the student.

## Changing things later

- **Email design:** edit `Email.html` in the editor (or `apps-script/Email.html` here, then paste it in). Then
  **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The URL stays the same, so Netlify
  needs no change.
- **Preview the email without sending one:** run `node scripts/render-email-preview.mjs` and open
  `apps-script/email-preview.html`.
- **Columns:** edit `HEADERS` / `WIDTHS` in `CONFIG` and `rowFor_()` in Code.gs. The header row is only written
  when the tab is empty, so rename or clear the old tab first.
- **Recipient:** `NOTIFY_TO` in `CONFIG`. Use commas for several addresses.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Form says "We could not send your details just now" | Netlify → Logs → Functions → `lead`. `APPS_SCRIPT_URL / LEAD_SECRET not set` means step 5 is missing, or the site hasn't been redeployed since. |
| Log says `apps script refused: unauthorised` | `LEAD_SECRET` differs between Netlify and Script Properties. |
| Log says `non-JSON (HTTP 401/403)` | The deployment's access isn't **Anyone**, or you deployed a "Test deployment" instead of a New deployment. |
| Rows appear but no email | Apps Script → **Executions** shows the error. The account may have hit Gmail's daily limit: about 100/day for a free Gmail account, 1,500/day for Google Workspace. |
| Code edited but nothing changed | Saving isn't enough: make a **new version** of the deployment (see *Email design* above). |
