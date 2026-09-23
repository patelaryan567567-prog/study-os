# Code Signing Setup — StudyOS (Windows Smart App Control)

## Why signing is required

Windows **Smart App Control (SAC)** blocks any unsigned / untrusted binary and
has **no per-app exclusion list** — an unsigned `StudyOS.exe` cannot be
whitelisted. The only way to distribute the app while SAC stays ON is to sign
the executables with a certificate that has **cloud reputation**.

Current status (checked 2026-09-04):

- `release\StudyOS Setup 1.0.0.exe` → **NotSigned**
- `release\win-unpacked\StudyOS.exe` → **NotSigned**
- SAC state → **ON** (`HKLM\SYSTEM\CurrentControlSet\Control\CI\Policy\VerifiedAndReputablePolicyState = 1`)

> ⚠️ Self-signed certificates do **NOT** work with SAC — SAC only trusts
> certificates with cloud reputation (public CA-issued).

---

## Option A (recommended) — Azure Trusted Signing (~$9.99/month)

Microsoft's own signing service. Cheapest option with **instant** Smart App
Control / SmartScreen reputation.

1. Create an Azure account (pay-as-you-go) if you don't have one.
2. Portal → **Trusted Signing** → Create account
   - Plan: **Basic** ($9.99/month)
   - **Identity validation**: submit legal-person (business) or
     individual identity — approval usually takes 1–3 business days.
3. In the Trusted Signing account → **Certificate profiles** → create a profile
   (Public Trust). Note the profile name.
4. Note these three values from the account overview:
   - **Endpoint** — e.g. `https://eus.codesigning.azure.net/`
   - **Account name**
   - **Certificate profile name**
5. Uncomment and fill `azureSignOptions` in `electron/electron-builder.yml`.
6. Rebuild — every artifact is signed automatically:

   ```powershell
   npm run app:build
   ```

Docs: https://learn.microsoft.com/azure/trusted-signing/

## Option B — EV / OV Code Signing certificate

Buy a certificate from a public CA (DigiCert, Sectigo, SSL.com, Certum…):

| Type | Price/yr (approx.) | SAC / SmartScreen reputation |
|------|--------------------|------------------------------|
| **EV** | $250–500 | Instant |
| **OV** | $100–300 | Good, but may need some installs/time first |

Since June 2023, all code-signing private keys must live on a **hardware
token or cloud HSM** (the CA provides this). Export a PFX only if your CA
allows cloud signing.

Configure signing via environment variables (electron-builder reads them
during `npm run app:build`, no config change needed):

```powershell
$env:CSC_LINK = "C:\certs\studyos-codesign.pfx"   # path / https URL / base64
$env:CSC_KEY_PASSWORD = "<pfx password>"
npm run app:build
```

If your EV certificate lives on a USB token, electron-builder can use it via
the Windows certificate store:

```powershell
$env:CSC_NAME = "<exact subject name of the certificate>"
```

## Signing an already-built release (no full rebuild)

> **Note:** this path needs `signtool.exe` (Windows SDK), which is **not
> currently installed** on the build machine. electron-builder signs natively
> during `npm run app:build` with no SDK — that is the recommended flow.
> Install the Windows SDK only if you want the standalone script below.

```powershell
$env:CSC_LINK = "C:\certs\studyos-codesign.pfx"
$env:CSC_KEY_PASSWORD = "<pfx password>"
npm run sign
```

`scripts/sign-release.mjs` signs `release\StudyOS Setup *.exe` and
`release\win-unpacked\StudyOS.exe` with an RFC-3161 timestamp
(`/tr http://timestamp.digicert.com`), then verifies the result.

> Note: signing after the build invalidates the `.blockmap` hash used for
> delta auto-updates. Full releases do not use delta updates today, so this
> is fine — prefer `npm run app:build` with env vars for official releases.

---

## Verify a signature

```powershell
Get-AuthenticodeSignature "release\StudyOS Setup 1.0.0.exe" |
  Select-Object Status, @{N='Signer';E={$_.SignerCertificate.Subject}}
# Expected: Status = Valid, Signer = your identity
```

Check Smart App Control state:

```powershell
(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy').VerifiedAndReputablePolicyState
# 0 = Off, 1 = On, 2 = Evaluation
```

## Until the certificate arrives

SAC will keep blocking the packaged exe. Meanwhile you can still run the app
from source — Electron's own binary is signed by GitHub and is allowed:

```powershell
npm start        # packaged-mode Electron from node_modules
npm run dev      # Vite dev server
```
