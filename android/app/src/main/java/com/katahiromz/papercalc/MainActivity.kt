// GenericAppのメインアクティビティ。
// Copyright (c) 2023-2025 Katayama Hirofumi MZ. All Rights Reserved.

package com.katahiromz.papercalc

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.os.StrictMode
import android.speech.tts.TextToSpeech
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.ServiceWorkerClient
import android.webkit.ServiceWorkerController
import android.webkit.ValueCallback
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import com.google.android.material.snackbar.Snackbar
import java.util.Locale
import timber.log.Timber
import java.io.ByteArrayInputStream

// 複数の翻訳版を有効にするために、任意の翻訳版のコンテキストを作成できるようにする。
// https://qiita.com/tarumzu/items/b076c4635b38366cddee
fun Context.createLocalizedContext(locale: Locale): Context {
    val res = resources
    val config = Configuration(res.configuration)
    config.setLocale(locale)
    return createConfigurationContext(config)
}

/////////////////////////////////////////////////////////////////////
// region 定数

// トーストの種類 (showToast用)
const val SHORT_TOAST = 0
const val LONG_TOAST = 1

// スナックの種類 (showSnackbar用)
const val SHORT_SNACK = 0
const val LONG_SNACK = 1
const val ACTION_SNACK_OK = 2
// TODO: Add more snack

// ハードウェア アクセラレーションを有効にするか？
const val USE_HARDWARE_ACCELERATION = false

// endregion

class MainActivity : AppCompatActivity(), ValueCallback<String>, TextToSpeech.OnInitListener {
    /////////////////////////////////////////////////////////////////////
    // region 共通

    // デバッグログにTimberを使用する。
    private fun initTimber() {
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }
    }

    // Toast を表示する。
    fun showToast(text: String, typeOfToast: Int) {
        if (text == "") {
            cancelToast()
            return
        }
        when (typeOfToast) {
            SHORT_TOAST -> {
                lastToast = Toast.makeText(this, text, Toast.LENGTH_SHORT)
                lastToast?.show()
            }
            LONG_TOAST -> {
                lastToast = Toast.makeText(this, text, Toast.LENGTH_LONG)
                lastToast?.show()
            }
            else -> {
                Timber.w("showToast: Unknown typeOfToast: $typeOfToast. Displaying short toast as default.")
            }
        }
    }
    private var lastToast : Toast? = null
    // Toastをキャンセルする。
    fun cancelToast() {
        if (lastToast != null) {
            lastToast?.cancel()
            lastToast = null
        }
    }

    // Snackbar を表示する。
    fun showSnackbar(text: String, typeOfSnack: Int) {
        if (text == "") {
            cancelSnackbar()
            return
        }
        val view = findViewById<View>(android.R.id.content)
        when (typeOfSnack) {
            SHORT_SNACK -> {
                lastSnackbar = Snackbar.make(view, text, Snackbar.LENGTH_SHORT)
                lastSnackbar?.show()
            }
            LONG_SNACK -> {
                lastSnackbar = Snackbar.make(view, text, Snackbar.LENGTH_LONG)
                lastSnackbar?.show()
            }
            ACTION_SNACK_OK -> {
                lastSnackbar = Snackbar.make(view, text, Snackbar.LENGTH_INDEFINITE)
                val buttonText = getLocString(R.string.ok)
                lastSnackbar?.setAction(buttonText) {
                    // TODO: Add action
                }
                lastSnackbar?.show()
            }
            // TODO: Add more Snack
            else -> {
                Timber.w("showSnackbar: Unknown typeOfSnack: $typeOfSnack. Snackbar not shown.")
            }
        }
    }
    private var lastSnackbar : Snackbar? = null
    // Snackbarをキャンセルする。
    fun cancelSnackbar() {
        if (lastSnackbar != null) {
            lastSnackbar?.dismiss()
            lastSnackbar = null
        }
    }

    // 画面の明るさを調整する。
    private var screenBrightness: String = "normal"
    fun setBrightness(value: String) {
        runOnUiThread {
            val params: WindowManager.LayoutParams = window.attributes
            if (value == "brighter") {
                params.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL
            } else {
                params.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            }
            window.attributes = params
        }

        screenBrightness = value
    }

    // アプリを終了する。
    fun finishApp() {
        finish() // 完全には終了しない（タスクリストに残る）。
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        Timber.i("onWindowFocusChanged")
        super.onWindowFocusChanged(hasFocus)
    }

    // endregion

    /////////////////////////////////////////////////////////////////////
    // region イベントハンドラ関連

    private var webViewReady = false

    // アクティビティの作成時。
    override fun onCreate(savedInstanceState: Bundle?) {
        Timber.i("onCreate")

        setStrictMode()

        // おまじない。
        window.attributes.layoutInDisplayCutoutMode =
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS

        // 最初の画面を表示する。
        installSplashScreen()

        super.onCreate(savedInstanceState)

        // Timberを初期化。
        initTimber()

        // レイアウト ビューを指定する。
        setContentView(R.layout.activity_main)

        // アクションバーを隠す。
        supportActionBar?.hide()

        // ロケールをセットする。
        setCurLocale(Locale.getDefault())

        // システムバーが変更された場合を検出する。
        ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { view, insets ->
            Timber.i("ViewCompat.setOnApplyWindowInsetsListener")
            val sysBarsVisible = insets.isVisible(WindowInsetsCompat.Type.systemBars())
            WindowInsetsCompat.toWindowInsetsCompat(view.onApplyWindowInsets(insets.toWindowInsets()))
        }

        // 「戻る」ボタンのコールバックを登録。
        onBackPressedDispatcher.addCallback(this, onBackPressedCallback)
    }

    // 「戻る」ボタンをサポートするコールバック関数。
    private val onBackPressedCallback: OnBackPressedCallback = object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
            Timber.i("handleOnBackPressed")
            if (true) {
                // 'go_back' メッセージを投函する。おそらく'message'イベントリスナが受け取るはず。
                webView?.evaluateJavascript("postMessage('go_back');") { }
            } else {
              // 軽く閉じる（完全には閉じたいなら代わりにfinishAndRemoveTaskを使う）
              finish();
            }
        }
    }

    // アクティビティの開始時。
    override fun onStart() {
        Timber.i("onStart")
        super.onStart() // 親にも伝える。
    }

    private var speechVoiceVolume: Float = 1.0f

    // アクティビティの復帰時。
    override fun onResume() {
        Timber.i("onResume")
        super.onResume() // 親にも伝える。

        // 明るさを復帰。
        setBrightness(screenBrightness)

        // WebViewを再開
        webView?.onResume()

        // カメラを再開
        if (webViewReady) {
            webView?.evaluateJavascript("postMessage('onAppResume');") { }
        }
    }

    // アクティビティの一時停止時。
    override fun onPause() {
        Timber.i("onPause")
        super.onPause() // 親にも伝える。

        // WebViewを一時停止
        webView?.onPause()
    }

    // アクティビティの停止時。
    override fun onStop() {
        Timber.i("onStop")
        super.onStop() // 親にも伝える。

        // スピーチを停止する。
        stopSpeech()
    }

    // アクティビティの破棄時。
    override fun onDestroy() {
        Timber.i("onDestroy")

        // ウェブビューを破棄。
        webView?.destroy()

        super.onDestroy() // 親にも伝える。
    }

    // 値を受け取るのに使う。ValueCallback<String>より継承。
    override fun onReceiveValue(value: String) {
        resultString = value
    }
    private var resultString = ""

    // キーを押した？
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            // 音量キー
            KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_VOLUME_DOWN -> {
                // JavaScript側にカスタム イベントを渡す
                val script: String = if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
                  "window.dispatchEvent(new CustomEvent('PhysicalVolumeButton', { detail: { volumeType: 'up' } }));"
                } else {
                  "window.dispatchEvent(new CustomEvent('PhysicalVolumeButton', { detail: { volumeType: 'down' } }));"
                }
                webView?.evaluateJavascript(script, null);

                return true // 音量変更の動作をキャンセルする場合
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    // endregion

    /////////////////////////////////////////////////////////////////////
    // region WebView関連

    // ウェブビュー オブジェクト。
    private var webView: WebView? = null

    // クロームクライアント。
    private var chromeClient: CustomWebChromeClient? = null

    // ウェブビューを初期化する。
    private fun initWebView(savedInstanceState: Bundle?) {
        // 以前の状態を復元する。
        // SEE ALSO: https://twigstechtips.blogspot.com/2013/08/android-retain-instance-of-webview.html
        if (webView != null && savedInstanceState != null) {
            webView?.restoreState(savedInstanceState)
            return
        }

        try {
            val swController = ServiceWorkerController.getInstance()
            swController.setServiceWorkerClient(object : ServiceWorkerClient() {
                override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? {
                    // ServiceWorker のスクリプト取得を空レスポンスで阻止する（text/javascript を返す）
                    val empty = ByteArrayInputStream(ByteArray(0))
                    return WebResourceResponse("text/javascript", "UTF-8", empty)
                }
            })
            Timber.i("ServiceWorker disabled via ServiceWorkerController")
        } catch (e: Throwable) {
            Timber.w(e, "Failed to disable ServiceWorker via ServiceWorkerController")
        }

        // ウェブビューのビューを取得する。
        webView = findViewById(R.id.web_view)

        // webViewがnullの場合、以降の処理は行わない
        webView?.let { webViewInstance ->
            initWebSettings(webViewInstance) // webViewインスタンスを渡す
            initWebViewClient()
            initChromeClient(webViewInstance) // webViewインスタンスを渡す
        } ?: Timber.e("WebView (R.id.web_view) not found in layout.")
    }

    // ウェブビュー クライアントを初期化する。
    private fun initWebViewClient() {
        // WebViewAssetLoaderを設定する。
        // ルートパス"/"をassetsフォルダにマップすることで、
        // /smile-camera/... のパスが assets/smile-camera/... として解決される
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView?.webViewClient = CustomWebViewClient(object : CustomWebViewClient.Listener {
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?,
                                         error: WebResourceError?) {
                val description = error?.description?.toString()
                val url = request?.url?.toString()
                Timber.e("onReceivedError: %s for URL: %s", description, url)
            }

            override fun onReceivedHttpError(view: WebView?, request: WebResourceRequest?,
                                             errorResponse: WebResourceResponse?) {
                val url = request?.url?.toString()
                Timber.e("onReceivedHttpError for URL: %s", url)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                Timber.i("onPageFinished: %s", url)
                findViewById<TextView>(R.id.loading).visibility = View.GONE
            }
        }, assetLoader)
    }

    // クロームクライアントを初期化する。
    private fun initChromeClient(currentWebView: WebView) {
        // まず、クロームクライアントを作成する。
        chromeClient = CustomWebChromeClient(this, object : CustomWebChromeClient.Listener {
            override fun onSpeech(text: String, volume: Float): Boolean {
                Timber.i("onSpeech")
                theSpeechText = text // スピーチテキストをセットする。
                return speechText(text, volume) // スピーチを開始する。
            }

            override fun onShowToast(text: String, typeOfToast: Int) {
                showToast(text, typeOfToast) // Toastを表示する。
            }

            override fun onShowSnackbar(text: String, typeOfSnack: Int) {
                showSnackbar(text, typeOfSnack) // Snackbarを表示する。
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                val bar: ProgressBar = findViewById(R.id.progressBar)
                bar.progress = newProgress
                if (newProgress == 100)
                    bar.visibility = View.INVISIBLE // 進捗が完了したらプログレスを非表示にする。
            }

            override fun onBrightness(value: String) {
                setBrightness(value) // 明るさを指定する。
            }

            override fun onFinishApp() {
                finishApp() // アプリを終了する。
            }
        })
        currentWebView.webChromeClient = chromeClient

        // JavaScript側からメソッドを呼び出せるインターフェイスを提供する。
        chromeClient?.let { currentWebView.addJavascriptInterface(it, "android") }

        // WebView初期化完了後、URLをロードする
        webViewReady = true
        val url = getLocString(R.string.url)
        Timber.i("url: " + url)
        currentWebView.loadUrl(url)
    }

    // ウェブ設定を初期化する。
    @SuppressLint("SetJavaScriptEnabled")
    private fun initWebSettings(currentWebView: WebView) {
        // 背景色は黒。
        currentWebView.setBackgroundColor(0)

        // 設定を取得する。
        val settings = currentWebView.settings

        settings.javaScriptEnabled = true // JavaScriptを有効化。
        settings.domStorageEnabled = true // localStorageを有効化。
        settings.mediaPlaybackRequiresUserGesture = false // ジェスチャーなくてもメディア反応可。
        // WebViewAssetLoaderを使用する場合でも、内部的にassetsにアクセスする必要があるため
        // allowFileAccessは有効のままにする（ただしfile://スキームの直接使用はしない）
        settings.allowFileAccess = true
        settings.allowContentAccess = false // コンテンツアクセスは無効化。
        settings.cacheMode = WebSettings.LOAD_DEFAULT // キャッシュモードを最適化
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true) // デバッギングを有効にする。
        }

        // JavaScript側からGenericAppのバージョン情報を取得できるようにする。
        val versionName = getVersionName()
        settings.userAgentString += "/SmileCamera/Android/$versionName/"

        // 混合コンテンツを許可する
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        if (USE_HARDWARE_ACCELERATION) {
            // MediaRecorderはGPUを使うので、ハードウェア アクセラレーションを有効にします
            currentWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        }
    }

    // バージョン名を取得する。
    private fun getVersionName(): String {
        val appName: String = this.packageName
        val pm: PackageManager = this.packageManager
        val pi: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.getPackageInfo(appName, PackageManager.PackageInfoFlags.of(PackageManager.GET_META_DATA.toLong()))
        } else {
            pm.getPackageInfo(appName, PackageManager.GET_META_DATA)
        }
        return pi.versionName ?: "(unknown version)"
    }

    // endregion

    /////////////////////////////////////////////////////////////////////
    // region ロケール関連

    private var currLocale: Locale = Locale.ENGLISH
    var currLocaleContext: Context? = null

    // 現在のロケールをセットする。
    fun setCurLocale(locale: Locale) {
        currLocale = locale
        currLocaleContext = null

        // TextToSpeechにもロケールをセットする。
        if (isSpeechReady && tts != null) {
            tts?.let { textToSpeech ->
                if (textToSpeech.isLanguageAvailable(locale) >= TextToSpeech.LANG_AVAILABLE) {
                    textToSpeech.language = locale
                } else {
                    Timber.w("Locale $locale not available for TTS.")
                }
            }
        } else {
            // TTSが準備できていない場合は、onInitで再度ロケール設定を試みるか、
            // 準備完了後に明示的に設定するロジックが必要になることがあります。
            // 現状では、準備完了時にデフォルトロケールが設定されます。
        }
    }

    // ローカライズされた文字列を取得する。複数ロケール対応のため、特殊な実装が必要。
    private fun getLocString(id: Int, locale: Locale): String {
        if (currLocaleContext == null) {
            currLocaleContext = applicationContext.createLocalizedContext(locale)
        }
        return currLocaleContext?.getString(id) ?: ""
    }
    fun getLocString(id: Int): String {
        return getLocString(id, currLocale)
    }

    // endregion

    /////////////////////////////////////////////////////////////////////
    // region TextToSpeech関連

    private var tts: TextToSpeech? = null // TextToSpeechオブジェクト。
    private var isSpeechReady = false // スピーチの準備が完了したか？
    private var theSpeechText = "" // スピーチテキスト。

    // TextToSpeechを初期化する。
    private fun initTextToSpeech() {
        // 既存のttsインスタンスがあればシャットダウンする。
        tts?.stop()
        tts?.shutdown()
        // 初期化。
        tts = TextToSpeech(this, this)
    }

    // TextToSpeechのために用意された初期化完了ルーチン。
    // TextToSpeech.OnInitListener
    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isSpeechReady = true
        }
    }

    // スピーチを開始する。
    fun speechText(text: String, volume: Float): Boolean {
        if (isSpeechReady && tts != null) {
            val params = Bundle()
            val speed = 0.3f // 0..1
            val pitch = 0.8f // 0..1
            if (volume >= 0)
                speechVoiceVolume = volume
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, speechVoiceVolume)
            tts?.setPitch(pitch)
            tts?.setSpeechRate(speed)
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params, "utteranceId_speech")
            return true
        } else {
            Timber.w("tts is not ready")
            return false
        }
    }

    // スピーチを停止する。
    private fun stopSpeech() {
        if (isSpeechReady) {
            tts?.stop()
        }
    }

    // endregion

    /////////////////////////////////////////////////////////////////////
    // region その他の設定

    private fun setStrictMode() {
        if (BuildConfig.DEBUG) {
            StrictMode.setThreadPolicy(
                StrictMode.ThreadPolicy.Builder()
                    .detectAll()
                    .build()
            )
            StrictMode.setVmPolicy(
                StrictMode.VmPolicy.Builder()
                    .detectAll()
                    .build()
            )
        }
    }

    // endregion
}