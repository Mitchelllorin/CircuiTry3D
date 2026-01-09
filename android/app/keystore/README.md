# Android signing keystore (local-only)

Do **not** commit keystores to git.

## Setup

1. Generate a keystore locally (example):

```bash
cd android/app/keystore
keytool -genkey -v -keystore your-upload-keystore.jks \
  -alias your-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Copy `android/key.properties.example` to `android/key.properties` and update:

- `storeFile=keystore/your-upload-keystore.jks`
- `storePassword=...`
- `keyAlias=...`
- `keyPassword=...`

3. Back up the keystore securely. You cannot ship updates without the same signing key.

