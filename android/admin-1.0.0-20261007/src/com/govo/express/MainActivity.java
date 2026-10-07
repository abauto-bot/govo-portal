package com.govo.express;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import java.util.*;

/** Role-specific client for the existing GOVO HTTPS application. */
public final class MainActivity extends Activity {
    private WebView web;
    private ProgressBar progress;
    private LinearLayout error;
    private String host, home;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest mediaRequest;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private static final int FILE_PICK = 41, MEDIA = 42, LOCATION = 43;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        host = getString(getResources().getIdentifier("role_host", "string", getPackageName()));
        home = getString(getResources().getIdentifier("home_url", "string", getPackageName()));
        getWindow().setStatusBarColor(Color.rgb(3,16,24));
        getWindow().setNavigationBarColor(Color.rgb(3,16,24));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(3,16,24));
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(i.left, i.top, i.right, i.bottom);
            } else v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(57,231,95)));
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));
        FrameLayout content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(3,16,24));
        content.addView(web, new FrameLayout.LayoutParams(-1,-1));
        error = new LinearLayout(this);
        error.setGravity(Gravity.CENTER);
        error.setOrientation(LinearLayout.VERTICAL);
        error.setPadding(dp(24),dp(24),dp(24),dp(24));
        error.setBackgroundColor(Color.rgb(3,16,24));
        TextView message = new TextView(this);
        message.setText("GOVO সংযোগ পাওয়া যাচ্ছে না\nইন্টারনেট চালু করে আবার চেষ্টা করুন।");
        message.setTextColor(Color.WHITE);
        message.setTextSize(18);
        message.setGravity(Gravity.CENTER);
        error.addView(message);
        Button retry = new Button(this);
        retry.setText("আবার চেষ্টা করুন");
        retry.setOnClickListener(v -> { error.setVisibility(View.GONE); web.reload(); });
        error.addView(retry);
        content.addView(error, new FrameLayout.LayoutParams(-1,-1));
        error.setVisibility(View.GONE);
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setGeolocationEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return r.isForMainFrame() && navigate(r.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) { return navigate(Uri.parse(url)); }
            @Override public void onPageStarted(WebView v, String u, android.graphics.Bitmap icon) {
                error.setVisibility(View.GONE); progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView v, String u) { progress.setVisibility(View.GONE); CookieManager.getInstance().flush(); }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) { error.setVisibility(View.VISIBLE); progress.setVisibility(View.GONE); }
            }
            @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse e) {
                if (r.isForMainFrame() && e.getStatusCode() >= 500) error.setVisibility(View.VISIBLE);
            }
            @Override public void onReceivedHttpAuthRequest(WebView v, HttpAuthHandler handler, String challengeHost, String realm) {
                Uri current = Uri.parse(v.getUrl() == null ? home : v.getUrl());
                if (!host.equalsIgnoreCase(challengeHost) || !trusted(current)) { handler.cancel(); return; }
                showAdminLogin(handler);
            }
            @Override public void onReceivedSslError(WebView v, SslErrorHandler handler, android.net.http.SslError e) {
                handler.cancel(); error.setVisibility(View.VISIBLE); progress.setVisibility(View.GONE);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView v, int p) { progress.setProgress(p); }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                String[] types = params.getAcceptTypes();
                List<String> accepted = new ArrayList<>();
                for (String type : types) if (type != null && type.contains("/")) accepted.add(type);
                picker.setType(accepted.size() == 1 ? accepted.get(0) : "*/*");
                if (accepted.size() > 1) picker.putExtra(Intent.EXTRA_MIME_TYPES, accepted.toArray(new String[0]));
                picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(picker, FILE_PICK); }
                catch (ActivityNotFoundException ex) { fileCallback.onReceiveValue(null); fileCallback = null; toast("ফাইল বাছাই করার অ্যাপ পাওয়া যায়নি"); }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!trusted(request.getOrigin()) || mediaRequest != null) { request.deny(); return; }
                    List<String> permissions = new ArrayList<>();
                    for (String resource : request.getResources()) {
                        if (resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) permissions.add(Manifest.permission.RECORD_AUDIO);
                        else if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) permissions.add(Manifest.permission.CAMERA);
                        else { request.deny(); return; }
                    }
                    mediaRequest = request;
                    new AlertDialog.Builder(MainActivity.this).setTitle("GOVO অনুমতি")
                        .setMessage("এই পেজে মাইক্রোফোন বা ক্যামেরা ব্যবহার করতে দেবেন?")
                        .setPositiveButton("অনুমতি দিন", (d,w) -> {
                            if (mediaRequest != request) return;
                            List<String> missing = new ArrayList<>();
                            for (String p : permissions) if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
                            if (missing.isEmpty()) finishMedia(); else requestPermissions(missing.toArray(new String[0]), MEDIA);
                        }).setNegativeButton("না", (d,w) -> denyMedia()).setOnCancelListener(d -> denyMedia()).show();
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest r) { if (mediaRequest == r) mediaRequest = null; }
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!trusted(Uri.parse(origin)) || locationCallback != null) { callback.invoke(origin,false,false); return; }
                locationOrigin = origin; locationCallback = callback;
                new AlertDialog.Builder(MainActivity.this).setTitle("GOVO অবস্থান")
                    .setMessage("এই পেজে আপনার অবস্থান ব্যবহার করতে দেবেন?")
                    .setPositiveButton("অনুমতি দিন", (d,w) -> {
                        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) finishLocation(true);
                        else requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION);
                    }).setNegativeButton("না", (d,w) -> finishLocation(false)).setOnCancelListener(d -> finishLocation(false)).show();
            }
        });
        web.setDownloadListener((url,agent,disposition,mime,length) -> openExternal(Uri.parse(url)));
        if (saved == null || web.restoreState(saved) == null) web.loadUrl(home);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
    }
    private void showAdminLogin(HttpAuthHandler handler) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL); box.setPadding(dp(24),dp(24),dp(24),dp(24));
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setColor(Color.rgb(8,31,39)); bg.setCornerRadius(dp(22)); box.setBackground(bg);
        android.graphics.Typeface font = getResources().getFont(getResources().getIdentifier("govo_ui","font",getPackageName()));
        TextView title = new TextView(this); title.setText("GOVO Admin — প্রবেশ করুন");
        title.setTypeface(font); title.setTextColor(Color.WHITE); title.setTextSize(21); box.addView(title);
        EditText username = new EditText(this); username.setHint("Private access username");
        username.setSingleLine(true); username.setTextColor(Color.WHITE); username.setHintTextColor(Color.LTGRAY); username.setTypeface(font);
        username.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        box.addView(username);
        EditText password = new EditText(this); password.setHint("Private access password");
        password.setSingleLine(true); password.setTextColor(Color.WHITE); password.setHintTextColor(Color.LTGRAY); password.setTypeface(font);
        password.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        box.addView(password);
        if (Build.VERSION.SDK_INT >= 26) box.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        AlertDialog dialog = new AlertDialog.Builder(this).setView(box).create();
        Button submit = new Button(this); submit.setText("প্রবেশ করুন"); submit.setTypeface(font);
        submit.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(52,222,119)));
        box.addView(submit);
        submit.setOnClickListener(v -> {
            String u = username.getText().toString().trim(), p = password.getText().toString();
            if (u.isEmpty() || p.isEmpty()) { toast("Username ও password লিখুন"); return; }
            handler.proceed(u,p); password.setText(""); dialog.dismiss();
        });
        Button cancel = new Button(this); cancel.setText("বাতিল"); cancel.setTypeface(font); box.addView(cancel);
        cancel.setOnClickListener(v -> { handler.cancel(); dialog.dismiss(); });
        dialog.setOnCancelListener(d -> handler.cancel()); dialog.show();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
            dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
    }
    private int dp(int value) { return (int)(getResources().getDisplayMetrics().density * value); }
    private boolean trusted(Uri uri) { return "https".equalsIgnoreCase(uri.getScheme()) && host.equalsIgnoreCase(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443); }
    private boolean navigate(Uri uri) {
        if (trusted(uri)) return false;
        openExternal(uri); return true;
    }
    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (!("https".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme) || "sms".equalsIgnoreCase(scheme) || "whatsapp".equalsIgnoreCase(scheme))) {
            toast("এই লিংক খোলা যাচ্ছে না"); return;
        }
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (ActivityNotFoundException ex) { toast("এই লিংকের জন্য অ্যাপ পাওয়া যায়নি"); }
    }
    private void toast(String text) { Toast.makeText(this,text,Toast.LENGTH_SHORT).show(); }
    private void denyMedia() { if (mediaRequest != null) { mediaRequest.deny(); mediaRequest = null; } }
    private void finishMedia() {
        if (mediaRequest == null) return;
        List<String> allowed = new ArrayList<>();
        for (String r : mediaRequest.getResources()) {
            String p = r.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE) ? Manifest.permission.RECORD_AUDIO : r.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE) ? Manifest.permission.CAMERA : "";
            if (!p.isEmpty() && checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED) allowed.add(r);
        }
        if (allowed.isEmpty()) mediaRequest.deny(); else mediaRequest.grant(allowed.toArray(new String[0]));
        mediaRequest = null;
    }
    private void finishLocation(boolean granted) {
        if (locationCallback != null) locationCallback.invoke(locationOrigin,granted,false);
        locationCallback = null; locationOrigin = null;
    }
    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(request,permissions,grants);
        if (request == MEDIA) finishMedia();
        if (request == LOCATION) finishLocation(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request,result,data);
        if (request != FILE_PICK || fileCallback == null) return;
        List<Uri> files = new ArrayList<>();
        if (result == RESULT_OK && data != null) {
            if (data.getClipData() != null) for (int i=0;i<data.getClipData().getItemCount();i++) files.add(data.getClipData().getItemAt(i).getUri());
            else if (data.getData() != null) files.add(data.getData());
        }
        files.removeIf(uri -> !"content".equals(uri.getScheme()));
        fileCallback.onReceiveValue(files.isEmpty() ? null : files.toArray(new Uri[0])); fileCallback = null;
    }
    private void goBack() { if (web.canGoBack()) { error.setVisibility(View.GONE); web.goBack(); } else finish(); }
    @Override public void onBackPressed() { goBack(); }
    @Override public void onSaveInstanceState(Bundle out) { web.saveState(out); super.onSaveInstanceState(out); }
    @Override protected void onPause() { CookieManager.getInstance().flush(); web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        denyMedia(); finishLocation(false);
        web.stopLoading(); web.destroy(); super.onDestroy();
    }
}
