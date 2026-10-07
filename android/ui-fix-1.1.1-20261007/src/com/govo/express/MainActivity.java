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

/** One GOVO client with customer, merchant and rider workspaces. */
public final class MainActivity extends Activity {
    private WebView web;
    private ProgressBar progress;
    private LinearLayout error;
    private String host, home;
    private android.graphics.Typeface uiFont;
    private boolean clearRoleHistory;
    private static final String[] ROLE_HOSTS = RolePolicy.HOSTS;
    private static final String[] ROLE_PATHS = RolePolicy.PATHS;
    private static final String[] ROLE_LABELS = RolePolicy.LABELS;
    private int activeRole;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest mediaRequest;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private static final int FILE_PICK = 41, MEDIA = 42, LOCATION = 43;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        uiFont=getResources().getFont(getResources().getIdentifier("govo_ui","font",getPackageName()));
        activeRole = Math.max(0,Math.min(2,getPreferences(MODE_PRIVATE).getInt("active_role",0)));
        setRoleAddress(activeRole);
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
        message.setTextSize(18); message.setTypeface(uiFont);
        message.setGravity(Gravity.CENTER);
        error.addView(message);
        Button retry = new Button(this);
        retry.setText("আবার চেষ্টা করুন");
        retry.setOnClickListener(v -> { error.setVisibility(View.GONE); web.reload(); });
        error.addView(retry);
        Button changeRole=new Button(this);changeRole.setText("ভূমিকা বদলান");changeRole.setTypeface(uiFont);
        changeRole.setOnClickListener(v -> chooseRole());error.addView(changeRole);
        content.addView(error, new FrameLayout.LayoutParams(-1,-1));
        error.setVisibility(View.GONE);
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setSafeBrowsingEnabled(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setUserAgentString(settings.getUserAgentString()+" GOVOAllInOne/1.1.1");
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
                denyMedia(); finishLocation(false);
                error.setVisibility(View.GONE); progress.setVisibility(View.VISIBLE);
                syncRole(Uri.parse(u));
            }
            @Override public void onPageFinished(WebView v, String u) {
                progress.setVisibility(View.GONE); CookieManager.getInstance().flush();
                installRoleSelector();
                if(clearRoleHistory){v.clearHistory();clearRoleHistory=false;}
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) { error.setVisibility(View.VISIBLE); progress.setVisibility(View.GONE); }
            }
            @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse e) {
                if (r.isForMainFrame() && e.getStatusCode() >= 500) error.setVisibility(View.VISIBLE);
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
                    if (!activeOrigin(request.getOrigin()) || mediaRequest != null) { request.deny(); return; }
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
                if (!activeOrigin(Uri.parse(origin)) || locationCallback != null) { callback.invoke(origin,false,false); return; }
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
        if(saved==null && !getPreferences(MODE_PRIVATE).getBoolean("role_chosen",false)) chooseRole();
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
    }
    private int dp(int value) { return (int)(getResources().getDisplayMetrics().density * value); }
    private boolean trusted(Uri uri) {return uri!=null && RolePolicy.roleOf(uri.toString())>=0;}
    private boolean activeOrigin(Uri uri){
        return trusted(uri) && web.getUrl()!=null && uri.getHost().equalsIgnoreCase(Uri.parse(web.getUrl()).getHost());
    }
    private void setRoleAddress(int role){host=ROLE_HOSTS[role];home="https://"+host+ROLE_PATHS[role];}
    private void syncRole(Uri uri){
        if(!trusted(uri))return;
        for(int i=0;i<ROLE_HOSTS.length;i++)if(ROLE_HOSTS[i].equalsIgnoreCase(uri.getHost())){
            activeRole=i;setRoleAddress(i);
            getPreferences(MODE_PRIVATE).edit().putInt("active_role",i).apply();break;
        }
    }
    private TextView nativeText(String text,int size,int color,boolean bold){
        TextView v=new TextView(this);v.setText(text);v.setTextSize(size);v.setTextColor(color);
        v.setTypeface(uiFont,bold?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL);
        v.setIncludeFontPadding(true);v.setLineSpacing(dp(3),1);return v;
    }
    private android.graphics.drawable.GradientDrawable panel(int color,int stroke){
        android.graphics.drawable.GradientDrawable d=new android.graphics.drawable.GradientDrawable();
        d.setColor(color);d.setCornerRadius(dp(20));d.setStroke(dp(1),stroke);return d;
    }
    private void chooseRole(){
        ((android.view.inputmethod.InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(web.getWindowToken(),0);
        Dialog dialog=new Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(22),dp(22),dp(22),dp(18));box.setBackground(panel(Color.rgb(7,28,37),Color.rgb(34,92,84)));
        TextView title=nativeText("আপনার ভূমিকা বেছে নিন",22,Color.WHITE,true);box.addView(title);
        TextView hint=nativeText("এক GOVO অ্যাপেই তিনটি কাজের জায়গা",13,Color.rgb(168,200,201),false);
        LinearLayout.LayoutParams hintParams=new LinearLayout.LayoutParams(-1,-2);hintParams.bottomMargin=dp(16);hintParams.topMargin=dp(6);box.addView(hint,hintParams);
        String[] descriptions={"দোকান, সেবা ও অর্ডার","ব্যবসা ও অর্ডার পরিচালনা","ডেলিভারি ও কাজ পরিচালনা"};
        for(int i=0;i<3;i++){
            final int role=i;
            LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(dp(16),dp(12),dp(16),dp(12));card.setMinimumHeight(dp(76));
            card.setBackground(panel(i==activeRole?Color.rgb(16,57,43):Color.rgb(16,43,52),i==activeRole?Color.rgb(57,231,95):Color.rgb(34,75,80)));
            card.addView(nativeText(ROLE_LABELS[i]+(i==activeRole?"  ✓":""),18,Color.rgb(57,231,95),true));
            card.addView(nativeText(descriptions[i],13,Color.rgb(220,238,238),false));
            card.setFocusable(true);card.setClickable(true);card.setContentDescription(ROLE_LABELS[i]+" — "+descriptions[i]);
            card.setOnClickListener(v->{dialog.dismiss();switchRole(role);});
            LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,-2);cp.bottomMargin=dp(10);box.addView(card,cp);
        }
        TextView close=nativeText("বন্ধ করুন",14,Color.rgb(168,200,201),true);close.setGravity(Gravity.CENTER);close.setMinHeight(dp(44));close.setFocusable(true);close.setClickable(true);
        close.setOnClickListener(v->dialog.dismiss());box.addView(close,new LinearLayout.LayoutParams(-1,-2));
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(false);scroll.addView(box);
        dialog.setContentView(scroll);dialog.show();
        Window w=dialog.getWindow();w.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
        int available=getResources().getDisplayMetrics().heightPixels-dp(80);
        w.setLayout(Math.min(getResources().getDisplayMetrics().widthPixels-dp(32),dp(440)),WindowManager.LayoutParams.WRAP_CONTENT);
        box.post(()->{if(box.getHeight()>available)w.setLayout(Math.min(getResources().getDisplayMetrics().widthPixels-dp(32),dp(440)),available);});
    }
    private void installRoleSelector(){
        if(web.getUrl()==null || !trusted(Uri.parse(web.getUrl())))return;
        String label="ভূমিকা: "+ROLE_LABELS[activeRole]+" ▾";
        String js="(()=>{let old=document.getElementById('govo-apk-role-selector');if(old)old.remove();let row=document.createElement('div');row.id='govo-apk-role-selector';row.style.cssText='display:flex;justify-content:flex-end;padding:2px 0 12px;gap:8px';let a=document.createElement('a');a.href='govo-role://choose';a.textContent="+org.json.JSONObject.quote(label)+";a.setAttribute('aria-label','ভূমিকা বদলান');a.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 16px;border-radius:14px;border:1px solid #39e75f55;background:#123b30;color:#8affb0;text-decoration:none;font:600 14px/1.6 system-ui,sans-serif';row.append(a);let h=document.querySelector('header');if(h)h.insertAdjacentElement('afterend',row);})()";
        web.evaluateJavascript(js,null);
    }
    private void switchRole(int role){
        denyMedia();finishLocation(false);web.stopLoading();activeRole=role;setRoleAddress(role);
        getPreferences(MODE_PRIVATE).edit().putInt("active_role",role).putBoolean("role_chosen",true).apply();
        clearRoleHistory=true;error.setVisibility(View.GONE);web.loadUrl(home);
    }
    private boolean navigate(Uri uri) {
        if("govo-role".equals(uri.getScheme()) && "choose".equals(uri.getHost())){
            if(web.getUrl()!=null && trusted(Uri.parse(web.getUrl())))chooseRole();
            return true;
        }
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
        if(!activeOrigin(mediaRequest.getOrigin())){denyMedia();return;}
        List<String> allowed = new ArrayList<>();
        for (String r : mediaRequest.getResources()) {
            String p = r.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE) ? Manifest.permission.RECORD_AUDIO : r.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE) ? Manifest.permission.CAMERA : "";
            if (!p.isEmpty() && checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED) allowed.add(r);
        }
        if (allowed.isEmpty()) mediaRequest.deny(); else mediaRequest.grant(allowed.toArray(new String[0]));
        mediaRequest = null;
    }
    private void finishLocation(boolean granted) {
        if (locationCallback != null) locationCallback.invoke(locationOrigin,granted && activeOrigin(Uri.parse(locationOrigin)),false);
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
