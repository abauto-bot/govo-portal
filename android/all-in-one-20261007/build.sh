#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
sdk="${ANDROID_SDK_ROOT:-/opt/android-sdk}"
tools="$sdk/build-tools/35.0.0"
platform="$sdk/platforms/android-35/android.jar"
signing="${GOVO_SIGNING_DIR:-$HOME/.local/share/govo-android/signing}"
mkdir -p build delivery "$signing"
chmod 700 "$signing"
if [ ! -f "$signing/release.jks" ]; then
  umask 077
  python3 -c 'import secrets; print(secrets.token_urlsafe(36))' > "$signing/password"
  keytool -genkeypair -keystore "$signing/release.jks" -storepass:file "$signing/password" -keypass:file "$signing/password" -alias govo-release -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=GOVO Express, O=GOVO Express, C=BD' -noprompt
  umask 022
fi
mkdir -p build/classes build/dex
javac -encoding UTF-8 --release 8 -classpath "$platform" -d build/classes src/com/govo/express/*.java
jar cf build/classes.jar -C build/classes .
"$tools/d8" --release --min-api 26 --lib "$platform" --output build/dex build/classes.jar
for role in allinone; do
  case "$role" in
    allinone) title='GOVO Express'; host='app.govoexpress.com'; path='/app'; filename='GOVO-Express-All-in-One-1.1.0.apk';;
    customer) title='GOVO Express'; host='app.govoexpress.com'; path='/app'; filename='GOVO-Express-Customer-1.0.0-20261006.apk';;
    merchant) title='GOVO Merchant'; host='merchant.govoexpress.com'; path='/merchant'; filename='GOVO-Merchant-1.0.0-20261006.apk';;
    rider) title='GOVO Rider'; host='rider.govoexpress.com'; path='/rider'; filename='GOVO-Rider-1.0.0-20261006.apk';;
  esac
  work="build/$role"
  mkdir -p "$work/res/values"
  cp -R res/drawable "$work/res/"
  cp res/values/styles.xml "$work/res/values/"
  cat > "$work/res/values/strings.xml" <<XML
<resources><string name="app_name">$title</string><string name="role_host">$host</string><string name="home_url">https://$host$path</string></resources>
XML
  cat > "$work/AndroidManifest.xml" <<XML
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.govo.express" android:versionCode="2026100701" android:versionName="1.1.0">
 <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35"/>
 <uses-permission android:name="android.permission.INTERNET"/>
 <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
 <uses-permission android:name="android.permission.RECORD_AUDIO"/>
 <uses-permission android:name="android.permission.CAMERA"/>
 <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
 <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
 <uses-feature android:name="android.hardware.camera" android:required="false"/>
 <uses-feature android:name="android.hardware.microphone" android:required="false"/>
 <uses-feature android:name="android.hardware.location" android:required="false"/>
 <application android:label="@string/app_name" android:icon="@drawable/govo_icon" android:roundIcon="@drawable/govo_icon" android:theme="@style/GovoTheme" android:allowBackup="false" android:usesCleartextTraffic="false" android:supportsRtl="true" android:enableOnBackInvokedCallback="true">
  <activity android:name="com.govo.express.MainActivity" android:exported="true" android:windowSoftInputMode="adjustResize">
   <intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
  </activity>
 </application>
</manifest>
XML
  "$tools/aapt2" compile --dir "$work/res" -o "$work/resources.zip"
  "$tools/aapt2" link -o "$work/unsigned.apk" -I "$platform" --manifest "$work/AndroidManifest.xml" "$work/resources.zip"
  (cd build/dex && zip -q -j "../$role/unsigned.apk" classes.dex)
  "$tools/zipalign" -f -p 4 "$work/unsigned.apk" "$work/aligned.apk"
  "$tools/apksigner" sign --ks "$signing/release.jks" --ks-key-alias govo-release --ks-pass "file:$signing/password" --out "delivery/$filename" "$work/aligned.apk"
  "$tools/apksigner" verify --verbose "delivery/$filename" > "$work/signature-verification.txt"
  "$tools/aapt2" dump badging "delivery/$filename" > "$work/package-verification.txt"
  "$tools/zipalign" -c -p 4 "delivery/$filename"
  printf 'VERIFIED %s\n' "$filename"
done
(cd delivery && sha256sum *.apk > SHA256SUMS.txt)
